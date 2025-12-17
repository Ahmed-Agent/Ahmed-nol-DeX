# NOLA Exchange - Decentralized Exchange on Polygon

## Overview
NOLA Exchange is a production-ready DEX (Decentralized Exchange) built with React and TypeScript, featuring multi-wallet support via wagmi/WalletConnect, token swaps with 0x and 1inch aggregation, and a real-time chat system with message reactions and hourly ranking.

## Current State - Message Reactions System (v2)
- Complete React conversion from original HTML
- Purple gradient theme with nebula animations and floating particles
- Multi-wallet support (MetaMask, WalletConnect, and more)
- Token swapping with best price aggregation (0x + 1inch)
- Real-time chat via Supabase with message reactions
- **NEW**: Message reaction system with hourly ranking and aura effects
- Mobile responsive (320px - 428px)

## Message Reactions Feature
### Functionality
- **Tap to React**: Users tap on any message to reveal animated like/dislike buttons
- **Hourly Ranking**: Top 3 liked messages each hour get special aura effects
- **Aura Effects**: 
  - #1 (most liked): Large glowing aura
  - #2: Medium glow
  - #3: Subtle glow
  - Colors follow chain theme (ETH=blue, POL=purple, BRG=yellow)
- **Counter Animation**: Like/dislike counts animate with bouncy effect
- **Persistent Display**: Messages stay ranked at top of recent messages section
- **Like Preservation**: Old reactions kept but not counted in next hour's ranking

### Database Schema
See `SUPABASE_SCHEMA.sql` for complete schema including:
- `message_reactions` table with hourly bucketing
- Functions for hourly ranking (`get_top_3_messages_current_hour`)
- Functions for reaction stats (current hour vs all-time)
- Indexes for fast queries

### UI Components
- **Reaction Buttons**: Circular themed buttons (primary/secondary colors per chain)
- **Aura Badges**: Numbered badges (#1, #2, #3) with glow effects
- **Animated Counts**: ThumbsUp/ThumbsDown icons with bounce animation
- **Glassmorphic Design**: Blurred backdrop with transparency

### Recent Changes (Dec 17, 2025)
1. Created `SUPABASE_SCHEMA.sql` with hourly ranking functions
2. Updated `client/src/lib/supabaseClient.ts` with ReactionStats type documentation
3. Enhanced `client/src/components/ChatPanel.tsx`:
   - Aura badge display for top 3 messages
   - Animated reaction buttons that appear on tap
   - Reaction count animation with bouncy effect
   - Chain-themed colors for all reactions
4. Added CSS animations in `client/src/index.css`:
   - `pulseAura`: Pulsing effect for top 3 messages
   - `slideIn`: Smooth entrance for notifications
   - `countBounce`: Bounce animation for like/dislike counts
5. Updated `server/routes.ts` with logging for top 3 tracking

## Project Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: wouter
- **State**: React hooks + TanStack Query
- **Wallet**: wagmi + viem
- **Styling**: Tailwind CSS + custom CSS variables
- **Real-time**: Supabase subscriptions for chat

### Backend (server/)
- **Framework**: Express.js
- **Purpose**: API proxy and static file serving
- **Rate Limiting**: IP-based rate limiting for chat messages (3/hour)
- **Reaction Handling**: Hourly ranking calculations with Supabase integration

### Key Files
- `client/src/App.tsx` - Main application entry
- `client/src/pages/home.tsx` - DEX swap interface
- `client/src/lib/config.ts` - Environment configuration
- `client/src/lib/wagmiConfig.ts` - Wallet configuration
- `client/src/lib/tokenService.ts` - Token fetching & pricing
- `client/src/lib/swapService.ts` - Quote aggregation & execution
- `client/src/lib/supabaseClient.ts` - Chat functionality + reactions
- `client/src/components/ChatPanel.tsx` - Chat UI with reactions
- `client/src/index.css` - Theme, animations, reactions styling
- `server/routes.ts` - API endpoints, reaction calculations
- `SUPABASE_SCHEMA.sql` - Reaction database schema

### Components
- `ParticleBackground` - Floating purple particles
- `Logo` - Animated rotating logo
- `ConnectButton` - Multi-wallet connection
- `TokenInput` - Token selection with search
- `SlippageControl` - Slippage settings
- `ChatPanel` - Sliding chat sidebar with reactions
- `Toast` - Notification system
- `Footer` - Links and copyright

## Environment Variables

All configuration in environment variables (see .env.example):
- `VITE_CHAIN_ID` - Polygon chain ID (137)
- `VITE_ZEROX_API_KEY` - 0x API key for quotes
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_LIFI_API_KEY` - LIFI API key for bridging
- `VITE_ETH_POL_API` - Etherscan/Polygonscan API key
- `VITE_CMC_API_KEY` - CoinMarketCap API key (optional)
- `COINGECKO` - CoinGecko API key (optional)

## Development

```bash
npm run dev  # Start development server
npm run build  # Build for production
```

The app runs on port 5000.

## Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- wagmi v2 + viem (wallet)
- ethers.js v5 (transactions)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- Supabase (real-time chat + reactions)
- Express.js (backend proxy)

## Design Tokens
- Primary Purple: #b445ff (POL)
- Secondary Purple: #7013ff (POL)
- Ethereum Blue: #4589ff (ETH)
- Bridge Yellow: #ffb545 (BRG)
- Background: radial gradient from #0c0014 to #1a002b
- Glass: rgba(255,255,255,0.05)
- Font: Arial, sans-serif

## User Preferences
- Dark mode only (DEX theme)
- Touch-friendly (44px minimum targets)
- Mobile-first responsive design
- Reaction system with hourly competitive ranking

## Implementation Notes

### Hourly Ranking Logic
- Each hour resets at the top of the hour (UTC)
- Messages get ranked by likes in current hour only
- Old likes persist in database but don't count toward new hour ranking
- Top 3 messages displayed at top of chat panel
- All-time like/dislike counts show for user awareness

### Reaction Button Behavior
- Tap message to show reaction buttons
- Like button toggles like/dislike (user can only have one per message)
- Dislike button works the same way
- Animation plays when count changes
- User's reaction highlighted in button background color

### Performance Optimizations
- Reactions refresh every 10 seconds (vs real-time to reduce API calls)
- Hourly bucketing in database reduces query complexity
- Message limit of 200 keeps chat performant
- Rate limiting prevents chat spam (3 messages/hour per IP)

## Next Steps / Future Features
1. Persist old hourly rankings for historical view
2. Add message pin/star feature
3. User profiles with reaction history
4. Chat message editing/deletion
5. Advanced filtering by top-liked/most-recent
6. Export chat history
