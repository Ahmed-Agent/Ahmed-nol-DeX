# Project Guidelines & Memory Copy

## Current Orders (December 25, 2025)

1.  **Token Fetching**:
    *   Fetch 450 biggest market cap tokens for Polygon.
    *   Fetch 450 biggest market cap tokens for Ethereum.
    *   Source: CoinGecko, CoinMarketCap (CMC), CoinAPI.
    *   Constraints: No duplicates, save to local JSON.
    *   Use Secrets: `VITE_COINGECKO_API_KEY`, `VITE_CMC_API_KEY`, `VITE_COINAPI_KEY`.

2.  **Price Aggregator Architecture**:
    *   Fast, super scalable aggregation.
    *   Fetch from all available pools simultaneously.
    *   Server-side caching: 20 seconds.
    *   Efficiency:
        *   One request per token from RPC/External API.
        *   Websocket connection for subsequent users interested in the same token.
        *   "Single Flight" refresh every 1.5 seconds.
    *   Subscription Logic:
        *   Subscribed users get price updates every 8 seconds.
        *   Unsubscribe when token is no longer in UI.
        *   TTL for unsubscription: 5 minutes.

3.  **Defaults & UI State**:
    *   Default pairs: Polygon/USDT and ETH/USDT from the JSON file.
    *   Bridge mode: No defaults, no clearance, persist user selection.

## Technical Guidelines
*   Avoid cache contamination.
*   Professional-grade aggregator.
*   Reduce RPC calls by 90%.
