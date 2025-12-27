import { useState, useEffect } from 'react';
import { getTopTokens, getCgStatsMap } from '@/lib/tokenService';
import { formatUSD, low } from '@/lib/config';
import { subscribeToPrice } from '@/lib/priceService';

interface TickerToken {
  symbol: string;
  price: number;
  change: number;
  logoURI: string;
  marketCap: number;
  address: string;
  chainId: number;
}

export function PriceTicker() {
  const [tokens, setTokens] = useState<TickerToken[]>([]);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const tokensMap = await getTopTokens();
        const tokenArray = Array.from(tokensMap.values());

        // Get top 7 by market cap
        const topByMcap = tokenArray
          .filter(t => t.marketCap && t.marketCap > 0)
          .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
          .slice(0, 7);

        // Get top 8 by 24h change (absolute value)
        const topByChange = tokenArray
          .filter(t => typeof t.priceChange24h === 'number' && Math.abs(t.priceChange24h) > 0.1)
          .sort((a, b) => Math.abs(b.priceChange24h || 0) - Math.abs(a.priceChange24h || 0))
          .slice(0, 8);

        // Combine using Set to avoid duplicates
        const addressSet = new Set<string>();
        const uniqueTokens: TickerToken[] = [];

        [...topByMcap, ...topByChange].forEach(token => {
          const addr = token.address.toLowerCase();
          if (!addressSet.has(addr)) {
            addressSet.add(addr);
            uniqueTokens.push({
              symbol: token.symbol,
              price: token.price || 0,
              change: token.priceChange24h || 0,
              logoURI: token.logoURI || '',
              marketCap: token.marketCap || 0,
              address: token.address,
              chainId: token.chainId || 1
            });
          }
        });

        setTokens(uniqueTokens);
      } catch (error) {
        console.error('Failed to load ticker data:', error);
      }
    };

    fetchTickerData();
  }, []);

  // Listen for real-time server singleflight updates
  useEffect(() => {
    if (tokens.length === 0) return;

    const unsubscribers = tokens.map(token => {
      return subscribeToPrice(token.address, token.chainId, (newPriceData) => {
        setTokens(prev => prev.map(t => {
          if (t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId) {
            return {
              ...t,
              price: newPriceData.price,
              marketCap: newPriceData.mc,
              // Note: volume/timestamp updated but not displayed in ticker
            };
          }
          return t;
        }));
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [tokens.length]); // Re-subscribe if token list changes

  if (tokens.length === 0) return null;

  // Duplicate tokens for a continuous scrolling effect
  const displayTokens = [...tokens, ...tokens, ...tokens];

  return (
    <div className="price-ticker-container">
      <div className="price-ticker-track">
        {displayTokens.map((token, idx) => (
          <div key={`${token.symbol}-${idx}`} className="ticker-item">
            {token.logoURI && (
              <img
                src={token.logoURI}
                alt={token.symbol}
                className="ticker-logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="ticker-symbol">{token.symbol}</span>
            <span className="ticker-price">{formatUSD(token.price)}</span>
            <span
              className="ticker-change"
              style={{
                color: token.change >= 0 ? '#9ef39e' : '#ff9e9e',
              }}
            >
              {token.change >= 0 ? '+' : ''}
              {token.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}