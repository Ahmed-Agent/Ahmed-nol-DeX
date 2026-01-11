# Token Price Aggregation System
**Lead Architect: Dr. Ahmed Mohamed**

## 🚀 System Overview
A professional-grade DeFi token swap platform featuring real-time price tracking, sophisticated on-chain data aggregation, and a robust multi-layer caching system.

## 🛠 Core Features & Architecture

### 1. Real-Time WebSocket Streaming
- **Sector-Based Multiplexing**: Single connection handles Price, Analytics, and Token Status sectors.
- **Shared Subscriptions**: Server de-duplicates requests (1,000 users watching WETH = 1 RPC request).
- **Auto-Cleanup**: 60-second inactivity TTL for active subscriptions to save resources.

### 2. Multi-Layer Caching Engine
- **7-Day Icon Cache**: Server-side "Mirror" system. Icons are fetched once from sources (TrustWallet, Uniswap, CoinGecko) and served locally.
- **High-Frequency Price Cache**: 20-second TTL for on-chain prices to prevent RPC "thundering herd."
- **Persistent Analytics Cache**: Disk-backed storage for volume, liquidity, and buy/sell metrics.

### 3. Client Experience (Frontend)
- **Instant Search**: Dropdowns consume client-side cached Blobs for zero-latency icon rendering.
- **TokenInfoSidebar**: Deep-dive analytics (Liquidity, Volume, Price Impact) updated in real-time via WS.
- **Visual Stability**: No layout shifts; icons are strictly mirrored from the server's local cache.

### 4. Scalability Metrics
- **RPC Reduction**: ~90% efficiency gain via shared subscription logic.
- **Concurrency**: Designed to handle thousands of live users by scaling with *unique token count* rather than *user count*.
- **Performance**: Sub-second price fetch, 8-second broadcast intervals.

---
*Created and maintained by Dr. Ahmed Mohamed*
