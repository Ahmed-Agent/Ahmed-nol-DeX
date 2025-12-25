# Token Price Aggregation System - Professional Enhancement

## PROJECT OVERVIEW
- **Type**: Full-stack token search & swap DEX aggregator
- **Chains**: Ethereum (1) & Polygon (137)
- **Current Status**: Established with external price fallbacks that need removal
- **Target Scale**: Support 1000+ users searching for different tokens simultaneously

## CRITICAL ORDERS (Execute One by One with User Confirmation)

### ORDER 1: ✅ COMPLETED
**Get Full Understanding & Prepare**
- Read codebase structure
- Identify current implementation
- Create local memory for orders

**Current Architecture Found:**
- Backend: Express + WebSocket server (routes.ts, index.ts)
- Frontend: React + wouter + TanStack Query (client/src)
- Storage: Local JSON files (eth-tokens.json, polygon-tokens.json) + in-memory caching
- Token Lists: 500 ETH + 500 POL (total 1000 tokens from CoinGecko)
- Price Sources: 
  - Current: External APIs (CoinGecko, CMC, DexScreener, GeckoTerminal, 0x, 1inch)
  - WebSocket subscriptions for real-time updates
  - On-chain price fetcher (stub returning dummy data)
  - 20-second cache TTL
  - 8-second update interval for subscribed users

### ORDER 2: PENDING
**Remove External Price Fallbacks & Consolidate Token Lists**
- Remove ALL price fallbacks (CoinGecko, CMC, DexScreener, GeckoTerminal)
- Remove ALL price caching logic (client & server)
- Keep swap/bridging intact
- Keep icon fallback intact
- Download top 500 tokens by MC from CoinGecko for Polygon
- Download top 500 tokens by MC from CoinGecko for Ethereum
- Create single consolidated 1K token JSON file
- Remove all OTHER local token file sources
- Keep contract address search fallback intact

### ORDER 3: PENDING
**Create Professional On-Chain Price Fetcher**
- Use Uniswap V2, Sushi, QuickSwap pools
- Handle real token decimals (no assumptions)
- Support both chains (Polygon & Ethereum) without confusion
- Handle flexible pool token ordering (USDT/TOKEN vs TOKEN/USDT)
- Fetch from ALL available pools simultaneously
- Cache best price, MC, volume for 20 seconds
- Remove old cached prices to prevent contamination
- Professional algo: 500 tokens in 10 sec, 500 in 10 sec = 1K in 20 sec
- Use user's secrets APIs only

### ORDER 4: PENDING
**Implement WebSocket Price Streaming**
- Token search → immediate price request when shown in suggestions
- One request per token (shared via WebSocket with other users)
- Dropdown shows cached price/MC/volume from server
- Users subscribe when token appears in suggestions
- Price updates every 8 seconds for subscribed users
- Users unsubscribe when:
  - User changes FROM/TO token selection
  - Token not in suggestions for 5+ minutes
- Defaults: Polygon+USDT, Ethereum+USDT, Bridge=no defaults
- Reduce 90% of RPC calls via shared subscriptions

## KEY CONSTRAINTS
✅ Backend/WebSocket deploy to Cloudflare  
✅ Deal by: Contract Address + Real Decimals + Chain ID  
✅ NO external API fallbacks  
✅ NO open-source price fallbacks  
✅ Use only user's secrets/APIs (VITE_* environment variables)  
✅ 100% on-chain pricing accuracy & speed  

## FILES TO MODIFY
- server/routes.ts - Remove external APIs, implement on-chain fetcher
- client/src/lib/tokenService.ts - Remove external fallbacks, update suggestion flow
- eth-tokens.json & polygon-tokens.json - Update with top 500 per chain
- server/routes.ts (WebSocket) - Implement auto-unsubscribe logic
- Frontend components - Update suggestion/price display flow

## CURRENT ISSUES TO FIX
1. getOnChainPrice() returns dummy data (price: 1.0)
2. External API fallbacks present in tokenService.ts
3. Price caching logic scattered across client/server
4. Token files not consolidated from top 1K MC tokens
5. No real Uniswap/Sushi/QuickSwap pool queries
