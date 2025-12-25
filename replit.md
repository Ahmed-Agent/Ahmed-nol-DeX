# Token Price Aggregation System - Professional Enhancement

## PROJECT OVERVIEW
- **Type**: Full-stack token search & swap DEX aggregator
- **Chains**: Ethereum (1) & Polygon (137)
- **Current Status**: Order 3 COMPLETE - Professional on-chain fetcher implemented
- **Target Scale**: Support 1000+ users searching for different tokens simultaneously

---

## ✅ COMPLETED ORDERS

### ORDER 1: ✅ COMPLETED
Full codebase understanding and memory preparation.

### ORDER 2: ✅ COMPLETED
- Removed ALL external price fallbacks (CoinGecko, CMC, DexScreener, GeckoTerminal, 0x, 1inch)
- Removed ALL price caching logic (client & server)
- Updated token loading to use self-hosted JSON only
- Created polygon-tokens.json structure
- Kept swap/bridging intact
- Kept icon fallback intact

### ORDER 3: ✅ COMPLETED
**Professional On-Chain Price Fetcher Implementation**

**IMPLEMENTED:**
- ✅ Uniswap V2 pool querying with real reserve data
- ✅ Sushi (SushiSwap) factory support for both chains
- ✅ QuickSwap support for Polygon
- ✅ Real token decimals detection (no assumptions)
- ✅ Flexible pool token ordering (handles TOKEN/USDT and USDT/TOKEN)
- ✅ Multi-pool querying across all DEX factories simultaneously
- ✅ 20-second cache TTL with automatic cleanup
- ✅ Old cache entry removal (prevents contamination)
- ✅ Support for both Ethereum & Polygon chains
- ✅ Professional error handling and fallbacks

**FEATURES:**
- Tries USDC, USDT, WETH as quote tokens in order
- Queries all Uniswap V2 + Sushi + QuickSwap pools
- Calculates price from reserve ratios: `price = quoteReserve * 10^tokenDecimals / (tokenReserve * 10^quoteDecimals)`
- Caches best price for 20 seconds
- Cleans expired cache entries when size exceeds 5000

---

## 📋 PENDING ORDER

### ORDER 4: NEXT
**Implement WebSocket Price Streaming**
- Token search triggers immediate price request when shown in suggestions
- One request per token (shared via WebSocket with other users)
- Dropdown displays cached price/MC/volume from server
- Users subscribe when token appears in suggestions
- Price updates every 8 seconds for subscribed users
- Auto-unsubscribe on:
  - User changes FROM/TO token selection
  - Token not in suggestions for 5+ minutes
- Defaults: Polygon+USDT, Ethereum+USDT
- Reduce 90% RPC calls via shared subscriptions

---

## CODE IMPLEMENTATION DETAILS

### server/routes.ts - getOnChainPrice()
```typescript
// Chain configuration with DEX factories for each chain
const CHAIN_CONFIG = {
  1: { // Ethereum
    uniswapFactories: ["0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"],
    sushiFactory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e37608"
  },
  137: { // Polygon
    uniswapFactories: ["0x5757371414417b8C6CAd16e5dBb0d812eEA2d29c"],
    sushiFactory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    quickswapFactory: "0x5757371414417b8C6CAd16e5dBb0d812eEA2d29c"
  }
}

// getPriceFromPool(): queries pair reserves and calculates price
// getOnChainPrice(): main function that:
//   1. Checks 20s cache
//   2. Gets real token decimals
//   3. Queries pools for USDC, USDT, WETH
//   4. Tries all DEX factories
//   5. Returns best price with cleanup
```

### Key Functions
- `getPriceFromPool()`: Queries single pool, handles token ordering
- `getOnChainPrice()`: Main fetcher with caching & cleanup
- Cache cleanup: Removes entries older than 40 seconds when cache > 5000 entries

### Data Flow
```
User clicks on token in suggestions
  ↓
Frontend: subscribeToPrice(address, chainId)
  ↓
WebSocket: { type: 'subscribe', address, chainId }
  ↓
Server: getOnChainPrice(address, chainId)
  ↓
Query pools (USDC/USDT/WETH on Uniswap/Sushi/QuickSwap)
  ↓
Calculate price from reserves
  ↓
Cache for 20 seconds
  ↓
Send via WebSocket every 8 seconds to all subscribed users
```

---

## FILES MODIFIED

### client/src/lib/tokenService.ts
- Removed: CMC, CoinGecko, DexScreener, GeckoTerminal fetchers
- Removed: getAllExternal fallbacks and cascades
- Changed: getTokenPriceUSD() → calls /api/prices/onchain only
- Changed: loadTokensForChain() → loads from self-hosted JSON only
- Updated: refreshMarketData() → uses WebSocket

### server/routes.ts
- Added: CHAIN_CONFIG with DEX factories
- Added: getPriceFromPool() helper function
- Rewrote: getOnChainPrice() with real pool querying
- Removed: External API proxies (CoinGecko, CMC)
- Removed: General API caching
- Removed: Source rotation logic
- Kept: WebSocket infrastructure (activeSubscriptions)

### Token Files
- eth-tokens.json: Preserved
- polygon-tokens.json: Created with base tokens

---

## KEY CONSTRAINTS (All Met)
✅ Backend/WebSocket deploy to Cloudflare  
✅ Deal by: Contract Address + Real Decimals + Chain ID  
✅ NO external API fallbacks  
✅ 100% on-chain pricing from Uniswap V2/Sushi/QuickSwap  
✅ Real decimals (not assumptions)  
✅ Flexible token ordering support  
✅ 20-second cache with auto-cleanup  
✅ Both chains supported (ETH & Polygon)  
✅ Keep swap/bridging intact  
✅ Keep icon fallback intact  

---

## READY FOR ORDER 4

WebSocket infrastructure is in place at `/api/ws/prices`:
- ✅ Connection handling
- ✅ Subscribe/unsubscribe flow
- ✅ 8-second broadcast interval
- ✅ Active subscription tracking

ORDER 4 requires implementing:
1. Frontend: Detect token in suggestions, trigger subscribe
2. Server: Implement 5-minute auto-unsubscribe logic
3. UI: Update price display from WebSocket messages
4. Defaults: Polygon+USDT, Ethereum+USDT

---

## NEXT STEP

**Confirm ORDER 4 ready?** Or should I implement additional ORDER 3 refinements like:
- Historical liquidity tracking
- Volume calculation from event logs
- Market cap estimation from on-chain data
