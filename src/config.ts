import type { ApiConfig } from "./shared.ts";

export const API_CONFIG: ApiConfig = {
  name: "HL Portfolio API",
  slug: "hl-portfolio",
  description: "Analyze Hyperliquid accounts: positions, PnL, fills, open orders, funding. Full clearinghouse state for any wallet. The portfolio layer agents need for Hyperliquid trading intelligence.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/account",
      price: "$0.003",
      description: "Full clearinghouse state for a Hyperliquid wallet: positions, margin, PnL, leverage, liquidation prices.",
      toolName: "hyperliquid_get_account_state",
      toolDescription:
        `Use this when you need to retrieve the full portfolio state of a Hyperliquid perpetuals account. Returns the complete clearinghouse state for any wallet address including account-level metrics and per-position details.

Returns:
1. accountValue: total account equity in USD
2. totalNtlPos: total notional position size across all open positions
3. totalMarginUsed: margin currently locked in positions
4. withdrawable: available balance that can be withdrawn
5. positions[]: array of open positions, each with coin, size, entryPrice, unrealizedPnl, leverage, liquidationPrice, marginType (cross/isolated)

Example output: { accountValue: "125430.50", totalNtlPos: "89200.00", withdrawable: "36230.50", positions: [{ coin: "BTC", size: "1.5", entryPrice: "67500.00", unrealizedPnl: "2340.00", leverage: 5, liquidationPrice: "54200.00", marginType: "cross" }] }

Use this BEFORE analyzing a trader's risk exposure, checking margin health, or evaluating portfolio allocation on Hyperliquid. Essential for copy-trading evaluation and risk monitoring.

Do NOT use for trade history -- use hyperliquid_get_trade_fills instead. Do NOT use for open orders -- use hyperliquid_get_open_orders instead. Do NOT use for funding payments -- use hyperliquid_get_user_funding instead. Do NOT use for vault performance -- use hyperliquid_get_vault_details instead. Do NOT use for whale tracking -- use hyperliquid_detect_whale_trades instead.`,
      inputSchema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Hyperliquid wallet address (0x...) to retrieve account state for",
          },
        },
        required: ["address"],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "accountValue": {
              "type": "string",
              "description": "Total account equity in USD"
            },
            "totalNtlPos": {
              "type": "string",
              "description": "Total notional position size"
            },
            "totalMarginUsed": {
              "type": "string",
              "description": "Margin locked in positions"
            },
            "withdrawable": {
              "type": "string",
              "description": "Available balance"
            },
            "positions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "size": {
                    "type": "string"
                  },
                  "entryPrice": {
                    "type": "string"
                  },
                  "unrealizedPnl": {
                    "type": "string"
                  },
                  "leverage": {
                    "type": "number"
                  },
                  "liquidationPrice": {
                    "type": "string"
                  },
                  "marginType": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "required": [
            "accountValue",
            "positions"
          ]
        },
    },
    {
      method: "POST",
      path: "/api/fills",
      price: "$0.003",
      description: "Recent trade fills for a Hyperliquid wallet: coin, side, size, price, fee, closedPnl, timestamp.",
      toolName: "hyperliquid_get_trade_fills",
      toolDescription:
        `Use this when you need to retrieve recent trade executions (fills) for a Hyperliquid perpetuals account. Returns the most recent trades with full execution details including realized PnL on closed positions.

Returns:
1. coin: the perpetual market (BTC, ETH, SOL, etc.)
2. side: buy or sell (A = sell/ask, B = buy/bid)
3. size: position size filled
4. price: execution price
5. fee: trading fee paid in USD
6. closedPnl: realized PnL if the trade closed a position (0 if opening)
7. timestamp: execution time in milliseconds
8. hash: transaction hash for the fill
9. crossed: whether the order crossed the spread (taker)

Example output: { fills: [{ coin: "ETH", side: "buy", size: "10.0", price: "3450.50", fee: "0.69", closedPnl: "0.00", timestamp: 1712000000000 }], count: 20 }

Use this to analyze a trader's recent activity, calculate realized PnL, evaluate trading frequency, or audit trade execution quality on Hyperliquid.

Do NOT use for current positions -- use hyperliquid_get_account_state instead. Do NOT use for open/pending orders -- use hyperliquid_get_open_orders instead. Do NOT use for funding payments -- use hyperliquid_get_user_funding instead. Do NOT use for market-wide whale trades -- use hyperliquid_detect_whale_trades instead.`,
      inputSchema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Hyperliquid wallet address (0x...) to retrieve trade fills for",
          },
          limit: {
            type: "number",
            description: "Maximum number of fills to return (default: 20, max: 100)",
          },
        },
        required: ["address"],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "fills": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "side": {
                    "type": "string"
                  },
                  "size": {
                    "type": "string"
                  },
                  "price": {
                    "type": "string"
                  },
                  "fee": {
                    "type": "string"
                  },
                  "closedPnl": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "number"
                  }
                }
              }
            },
            "count": {
              "type": "number",
              "description": "Number of fills returned"
            }
          },
          "required": [
            "fills",
            "count"
          ]
        },
    },
    {
      method: "POST",
      path: "/api/orders",
      price: "$0.002",
      description: "Open orders for a Hyperliquid wallet: coin, side, size, price, order type, reduce-only flag.",
      toolName: "hyperliquid_get_open_orders",
      toolDescription:
        `Use this when you need to see all pending/open orders for a Hyperliquid perpetuals account. Returns every resting order on the book with full order parameters.

Returns:
1. coin: the perpetual market (BTC, ETH, SOL, etc.)
2. side: buy (bid) or sell (ask)
3. limitPx: limit price of the order
4. sz: order size
5. orderType: limit, stop-market, stop-limit, take-profit, etc.
6. reduceOnly: whether the order can only reduce an existing position
7. timestamp: when the order was placed
8. oid: unique order ID

Example output: { orders: [{ coin: "BTC", side: "buy", limitPx: "65000.00", sz: "0.5", orderType: "limit", reduceOnly: false, oid: 123456 }], count: 3 }

Use this to understand a trader's pending strategy, detect limit orders near current price, evaluate order-to-position ratio, or monitor stop-loss placement on Hyperliquid.

Do NOT use for executed trades -- use hyperliquid_get_trade_fills instead. Do NOT use for current positions -- use hyperliquid_get_account_state instead. Do NOT use for market-level orderbook -- use hyperliquid_get_market_data instead.`,
      inputSchema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Hyperliquid wallet address (0x...) to retrieve open orders for",
          },
        },
        required: ["address"],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "orders": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "side": {
                    "type": "string"
                  },
                  "limitPx": {
                    "type": "string"
                  },
                  "sz": {
                    "type": "string"
                  },
                  "orderType": {
                    "type": "string"
                  },
                  "reduceOnly": {
                    "type": "boolean"
                  },
                  "oid": {
                    "type": "number"
                  }
                }
              }
            },
            "count": {
              "type": "number",
              "description": "Number of open orders"
            }
          },
          "required": [
            "orders",
            "count"
          ]
        },
    },
    {
      method: "POST",
      path: "/api/funding",
      price: "$0.002",
      description: "Funding payments received/paid by a Hyperliquid wallet: coin, amount, rate, timestamp.",
      toolName: "hyperliquid_get_user_funding",
      toolDescription:
        `Use this when you need to retrieve funding payment history for a Hyperliquid perpetuals account. Returns all funding rate payments received or paid, useful for calculating funding income/expense and evaluating carry trade profitability.

Returns:
1. coin: the perpetual market (BTC, ETH, SOL, etc.)
2. fundingRate: the funding rate applied (positive = longs pay shorts)
3. payment: USD amount received (positive) or paid (negative)
4. timestamp: when the funding payment occurred
5. positionSize: the position size at time of funding

Example output: { funding: [{ coin: "BTC", fundingRate: "0.0001", payment: "-1.35", timestamp: 1712000000000, positionSize: "1.5" }], totalReceived: "45.20", totalPaid: "-12.30", netFunding: "32.90" }

Use this to evaluate funding income for carry/basis trades, calculate total cost of holding positions, or analyze the profitability of a delta-neutral funding strategy on Hyperliquid.

Do NOT use for current positions -- use hyperliquid_get_account_state instead. Do NOT use for market-wide funding rates -- use hyperliquid_get_funding_rates instead. Do NOT use for funding arbitrage opportunities -- use funding_arb_find_opportunities instead. Do NOT use for trade execution history -- use hyperliquid_get_trade_fills instead.`,
      inputSchema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Hyperliquid wallet address (0x...) to retrieve funding history for",
          },
          startTime: {
            type: "number",
            description: "Unix timestamp in milliseconds to start from (optional, default: last 7 days)",
          },
        },
        required: ["address"],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "funding": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "fundingRate": {
                    "type": "string"
                  },
                  "payment": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "number"
                  },
                  "positionSize": {
                    "type": "string"
                  }
                }
              }
            },
            "totalReceived": {
              "type": "string"
            },
            "totalPaid": {
              "type": "string"
            },
            "netFunding": {
              "type": "string"
            }
          },
          "required": [
            "funding"
          ]
        },
    },
  ],
};
