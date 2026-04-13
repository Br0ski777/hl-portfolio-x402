# HL Portfolio API

Full Hyperliquid account/portfolio analysis for AI agents. Retrieve positions, PnL, trade fills, open orders, and funding payments for any wallet via x402 micropayments.

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/account` | $0.003 | Full clearinghouse state: positions, margin, PnL, leverage |
| `POST /api/fills` | $0.003 | Recent trade fills with realized PnL and fees |
| `POST /api/orders` | $0.002 | All open/pending orders on the book |
| `POST /api/funding` | $0.002 | Funding payments received and paid |

## Example Requests & Responses

### Account State

```bash
curl -X POST https://hl-portfolio-production.up.railway.app/api/account \
  -H "Content-Type: application/json" \
  -d '{"address": "0x1234567890abcdef1234567890abcdef12345678"}'
```

```json
{
  "address": "0x1234...",
  "accountValue": "125430.50",
  "totalNtlPos": "89200.00",
  "totalMarginUsed": "52100.00",
  "withdrawable": "36230.50",
  "positions": [
    {
      "coin": "BTC",
      "size": "1.5",
      "entryPrice": "67500.00",
      "unrealizedPnl": "2340.00",
      "leverage": 5,
      "liquidationPrice": "54200.00",
      "marginType": "cross"
    }
  ],
  "positionCount": 1
}
```

### Trade Fills

```bash
curl -X POST https://hl-portfolio-production.up.railway.app/api/fills \
  -H "Content-Type: application/json" \
  -d '{"address": "0x1234...", "limit": 10}'
```

```json
{
  "address": "0x1234...",
  "fills": [
    {
      "coin": "ETH",
      "side": "buy",
      "size": "10.0",
      "price": "3450.50",
      "fee": "0.69",
      "closedPnl": "0.00",
      "timestamp": 1712000000000
    }
  ],
  "count": 10,
  "totalFees": "6.90",
  "totalClosedPnl": "234.50"
}
```

### Open Orders

```bash
curl -X POST https://hl-portfolio-production.up.railway.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"address": "0x1234..."}'
```

```json
{
  "address": "0x1234...",
  "orders": [
    {
      "coin": "BTC",
      "side": "buy",
      "limitPx": "65000.00",
      "sz": "0.5",
      "orderType": "limit",
      "reduceOnly": false
    }
  ],
  "count": 1
}
```

### Funding History

```bash
curl -X POST https://hl-portfolio-production.up.railway.app/api/funding \
  -H "Content-Type: application/json" \
  -d '{"address": "0x1234...", "startTime": 1711000000000}'
```

```json
{
  "address": "0x1234...",
  "funding": [
    {
      "coin": "BTC",
      "fundingRate": "0.0001",
      "payment": "-1.35",
      "timestamp": 1712000000000,
      "positionSize": "1.5"
    }
  ],
  "totalReceived": "45.20",
  "totalPaid": "-12.30",
  "netFunding": "32.90"
}
```

## Use Cases

- **Copy-trading evaluation**: Analyze a trader's positions, PnL, and execution quality before copying
- **Risk monitoring**: Track margin usage, leverage, and liquidation prices across positions
- **Funding income tracking**: Calculate net funding income for carry/basis trade strategies
- **Trade journaling**: Pull recent fills with realized PnL for performance analysis
- **Portfolio dashboards**: Build real-time Hyperliquid portfolio views for clients

## MCP Integration

Add to your Claude Desktop or Cursor config:

```json
{
  "mcpServers": {
    "hl-portfolio": {
      "type": "sse",
      "url": "https://hl-portfolio-production.up.railway.app/sse"
    }
  }
}
```

## Payment

All endpoints are gated by x402 protocol. Agents pay automatically in USDC on Base L2 per call. No API key needed.

## Related APIs

- [hyperliquid-data](https://github.com/Br0ski777/hyperliquid-data-x402) -- Market data, prices, orderbook for Hyperliquid
- [hyperliquid-whales](https://github.com/Br0ski777/hyperliquid-whales-x402) -- Whale trade detection and large position tracking
- [hl-vaults](https://github.com/Br0ski777/hl-vaults-x402) -- Vault performance, TVL, and depositor data
- [hl-funding](https://github.com/Br0ski777/hl-funding-x402) -- Market-wide funding rates and arbitrage opportunities
- [wallet-portfolio](https://github.com/Br0ski777/wallet-portfolio-x402) -- Multi-chain EVM wallet portfolio analysis
