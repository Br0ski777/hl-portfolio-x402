import type { Hono } from "hono";

// ─── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

function cached<T>(key: string): T | null {
  const e = cache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL ? (e.data as T) : null;
}
function setCache(key: string, data: any) { cache.set(key, { data, ts: Date.now() }); }

// ─── Hyperliquid API Helper ────────────────────────────────────────────────

const HL_API = "https://api.hyperliquid.xyz/info";

async function hlPost(body: Record<string, unknown>): Promise<any> {
  const resp = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    throw new Error(`Hyperliquid API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ─── Account State ─────────────────────────────────────────────────────────

async function getAccountState(address: string) {
  const cacheKey = `account_${address}`;
  const c = cached<any>(cacheKey);
  if (c) return c;

  const data = await hlPost({ type: "clearinghouseState", user: address });

  // Parse the clearinghouse state
  const marginSummary = data.marginSummary || {};
  const assetPositions = data.assetPositions || [];

  const positions = assetPositions
    .filter((p: any) => {
      const pos = p.position || p;
      const size = parseFloat(pos.szi || pos.size || "0");
      return size !== 0;
    })
    .map((p: any) => {
      const pos = p.position || p;
      return {
        coin: pos.coin,
        size: pos.szi || pos.size || "0",
        entryPrice: pos.entryPx || "0",
        unrealizedPnl: pos.unrealizedPnl || "0",
        leverage: pos.leverage ? parseFloat(pos.leverage.value || pos.leverage) : 0,
        liquidationPrice: pos.liquidationPx || null,
        marginType: pos.leverage?.type || (p.type === "oneWay" ? "cross" : "cross"),
        returnOnEquity: pos.returnOnEquity || "0",
        maxLeverage: pos.maxLeverage || null,
      };
    });

  const result = {
    address,
    accountValue: marginSummary.accountValue || "0",
    totalNtlPos: marginSummary.totalNtlPos || "0",
    totalMarginUsed: marginSummary.totalMarginUsed || "0",
    withdrawable: data.withdrawable || marginSummary.withdrawable || "0",
    crossMaintenanceMarginUsed: data.crossMaintenanceMarginUsed || "0",
    positions,
    positionCount: positions.length,
    timestamp: new Date().toISOString(),
    cachedFor: "30s",
  };

  setCache(cacheKey, result);
  return result;
}

// ─── Trade Fills ───────────────────────────────────────────────────────────

async function getTradeFills(address: string, limit: number = 20) {
  const cacheKey = `fills_${address}_${limit}`;
  const c = cached<any>(cacheKey);
  if (c) return c;

  const data = await hlPost({ type: "userFills", user: address });

  const fills = (Array.isArray(data) ? data : [])
    .slice(0, Math.min(limit, 100))
    .map((f: any) => ({
      coin: f.coin,
      side: f.side === "A" ? "sell" : "buy",
      size: f.sz || "0",
      price: f.px || "0",
      fee: f.fee || "0",
      closedPnl: f.closedPnl || "0",
      timestamp: f.time,
      hash: f.hash || null,
      crossed: f.crossed || false,
      dir: f.dir || null,
      oid: f.oid || null,
    }));

  // Calculate aggregate stats
  let totalFees = 0;
  let totalClosedPnl = 0;
  for (const f of fills) {
    totalFees += parseFloat(f.fee);
    totalClosedPnl += parseFloat(f.closedPnl);
  }

  const result = {
    address,
    fills,
    count: fills.length,
    totalFees: totalFees.toFixed(4),
    totalClosedPnl: totalClosedPnl.toFixed(4),
    timestamp: new Date().toISOString(),
    cachedFor: "30s",
  };

  setCache(cacheKey, result);
  return result;
}

// ─── Open Orders ───────────────────────────────────────────────────────────

async function getOpenOrders(address: string) {
  const cacheKey = `orders_${address}`;
  const c = cached<any>(cacheKey);
  if (c) return c;

  const data = await hlPost({ type: "openOrders", user: address });

  const orders = (Array.isArray(data) ? data : []).map((o: any) => ({
    coin: o.coin,
    side: o.side === "A" ? "sell" : "buy",
    limitPx: o.limitPx || "0",
    sz: o.sz || "0",
    orderType: o.orderType || "limit",
    reduceOnly: o.reduceOnly || false,
    timestamp: o.timestamp || null,
    oid: o.oid || null,
    cloid: o.cloid || null,
  }));

  const result = {
    address,
    orders,
    count: orders.length,
    timestamp: new Date().toISOString(),
    cachedFor: "30s",
  };

  setCache(cacheKey, result);
  return result;
}

// ─── User Funding ──────────────────────────────────────────────────────────

async function getUserFunding(address: string, startTime?: number) {
  const st = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000; // default: last 7 days
  const cacheKey = `funding_${address}_${st}`;
  const c = cached<any>(cacheKey);
  if (c) return c;

  const data = await hlPost({ type: "userFunding", user: address, startTime: st });

  const funding = (Array.isArray(data) ? data : []).map((f: any) => ({
    coin: f.coin,
    fundingRate: f.fundingRate || "0",
    payment: f.usdc || f.payment || "0",
    timestamp: f.time,
    positionSize: f.szi || f.sz || "0",
    hash: f.hash || null,
  }));

  // Compute totals
  let totalReceived = 0;
  let totalPaid = 0;
  for (const f of funding) {
    const amt = parseFloat(f.payment);
    if (amt >= 0) totalReceived += amt;
    else totalPaid += amt;
  }

  const result = {
    address,
    funding,
    count: funding.length,
    totalReceived: totalReceived.toFixed(4),
    totalPaid: totalPaid.toFixed(4),
    netFunding: (totalReceived + totalPaid).toFixed(4),
    startTime: new Date(st).toISOString(),
    timestamp: new Date().toISOString(),
    cachedFor: "30s",
  };

  setCache(cacheKey, result);
  return result;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export function registerRoutes(app: Hono) {
  // Account state
  app.post("/api/account", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.address) {
      return c.json({ error: "Missing required field: address (0x...)" }, 400);
    }
    const address: string = body.address.trim();
    if (!isValidAddress(address)) {
      return c.json({ error: "Invalid address — must be a valid 0x Ethereum address (42 chars)" }, 400);
    }
    try {
      const result = await getAccountState(address);
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: `Failed to fetch account state: ${e.message}` }, 500);
    }
  });

  // Trade fills
  app.post("/api/fills", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.address) {
      return c.json({ error: "Missing required field: address (0x...)" }, 400);
    }
    const address: string = body.address.trim();
    if (!isValidAddress(address)) {
      return c.json({ error: "Invalid address — must be a valid 0x Ethereum address (42 chars)" }, 400);
    }
    const limit = Math.min(Math.max(body.limit || 20, 1), 100);
    try {
      const result = await getTradeFills(address, limit);
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: `Failed to fetch trade fills: ${e.message}` }, 500);
    }
  });

  // Open orders
  app.post("/api/orders", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.address) {
      return c.json({ error: "Missing required field: address (0x...)" }, 400);
    }
    const address: string = body.address.trim();
    if (!isValidAddress(address)) {
      return c.json({ error: "Invalid address — must be a valid 0x Ethereum address (42 chars)" }, 400);
    }
    try {
      const result = await getOpenOrders(address);
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: `Failed to fetch open orders: ${e.message}` }, 500);
    }
  });

  // User funding
  app.post("/api/funding", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.address) {
      return c.json({ error: "Missing required field: address (0x...)" }, 400);
    }
    const address: string = body.address.trim();
    if (!isValidAddress(address)) {
      return c.json({ error: "Invalid address — must be a valid 0x Ethereum address (42 chars)" }, 400);
    }
    const startTime = body.startTime ? Number(body.startTime) : undefined;
    try {
      const result = await getUserFunding(address, startTime);
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: `Failed to fetch funding history: ${e.message}` }, 500);
    }
  });
}
