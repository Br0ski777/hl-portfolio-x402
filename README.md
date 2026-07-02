# HL Portfolio API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://hl-portfolio.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Analyze Hyperliquid accounts: positions, PnL, fills, open orders, funding. Full clearinghouse state for any wallet. The portfolio layer agents need for Hyperliquid trading intelligence. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "hl-portfolio": {
      "url": "https://hl-portfolio.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl -X POST "https://hl-portfolio.api.klymax402.com/api/account" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x0000000000000000000000000000000000dEaD"}'
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `hyperliquid_get_account_state` | POST | `/api/account` | $0.003 | Full clearinghouse state for a Hyperliquid wallet: positions, margin, PnL, leverage, liquidation prices. |
| `hyperliquid_get_trade_fills` | POST | `/api/fills` | $0.003 | Recent trade fills for a Hyperliquid wallet: coin, side, size, price, fee, closedPnl, timestamp. |
| `hyperliquid_get_open_orders` | POST | `/api/orders` | $0.002 | Open orders for a Hyperliquid wallet: coin, side, size, price, order type, reduce-only flag. |
| `hyperliquid_get_user_funding` | POST | `/api/funding` | $0.002 | Funding payments received/paid by a Hyperliquid wallet: coin, amount, rate, timestamp. |

### `hyperliquid_get_account_state`

Use this when you need to retrieve the full portfolio state of a Hyperliquid perpetuals account. Returns the complete clearinghouse state for any wallet address including account-level metrics and per-position details.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Hyperliquid wallet address (0x...) to retrieve account state for |

Example response:

```json
{ accountValue: "125430.50", totalNtlPos: "89200.00", withdrawable: "36230.50", positions: [{ coin: "BTC", size: "1.5", entryPrice: "67500.00", unrealizedPnl: "2340.00", leverage: 5, liquidationPrice: "54200.00", marginType: "cross" }] }
```

**When to use**: analyzing a trader's risk exposure, checking margin health, or evaluating portfolio allocation on Hyperliquid. Essential for copy-trading evaluation and risk monitoring.

**Not for**: trade history (use `hyperliquid_get_trade_fills`), open orders (use `hyperliquid_get_open_orders`), funding payments (use `hyperliquid_get_user_funding`), vault performance (use `hyperliquid_get_vault_details`), whale tracking (use `hyperliquid_detect_whale_trades`).

### `hyperliquid_get_trade_fills`

Use this when you need to retrieve recent trade executions (fills) for a Hyperliquid perpetuals account. Returns the most recent trades with full execution details including realized PnL on closed positions.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Hyperliquid wallet address (0x...) to retrieve trade fills for |
| `limit` | number | no | Maximum number of fills to return (default: 20, max: 100) |

Example response:

```json
{ fills: [{ coin: "ETH", side: "buy", size: "10.0", price: "3450.50", fee: "0.69", closedPnl: "0.00", timestamp: 1712000000000 }], count: 20 }
```

**Not for**: current positions (use `hyperliquid_get_account_state`), open/pending orders (use `hyperliquid_get_open_orders`), funding payments (use `hyperliquid_get_user_funding`).

### `hyperliquid_get_open_orders`

Use this when you need to see all pending/open orders for a Hyperliquid perpetuals account. Returns every resting order on the book with full order parameters.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Hyperliquid wallet address (0x...) to retrieve open orders for |

Example response:

```json
{ orders: [{ coin: "BTC", side: "buy", limitPx: "65000.00", sz: "0.5", orderType: "limit", reduceOnly: false, oid: 123456 }], count: 3 }
```

**Not for**: executed trades (use `hyperliquid_get_trade_fills`), current positions (use `hyperliquid_get_account_state`).

### `hyperliquid_get_user_funding`

Use this when you need to retrieve funding payment history for a Hyperliquid perpetuals account. Returns all funding rate payments received or paid, useful for calculating funding income/expense and evaluating carry trade profitability.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes | Hyperliquid wallet address (0x...) to retrieve funding history for |
| `startTime` | number | no | Unix timestamp in milliseconds to start from (optional, default: last 7 days) |

Example response:

```json
{ funding: [{ coin: "BTC", fundingRate: "0.0001", payment: "-1.35", timestamp: 1712000000000, positionSize: "1.5" }], totalReceived: "45.20", totalPaid: "-12.30", netFunding: "32.90" }
```

**Not for**: current positions (use `hyperliquid_get_account_state`), funding arbitrage opportunities (use `funding_arb_find_opportunities`), trade execution history (use `hyperliquid_get_trade_fills`).

## Example agent prompts

- "Retrieve the full portfolio state of a Hyperliquid perpetuals account"
- "Retrieve recent trade executions (fills) for a Hyperliquid perpetuals account"
- "See all pending/open orders for a Hyperliquid perpetuals account"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
