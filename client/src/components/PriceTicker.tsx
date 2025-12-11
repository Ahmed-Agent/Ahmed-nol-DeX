
import { useState, useEffect } from 'react';
import { getTopTokens, getCgStatsMap } from '@/lib/tokenService';
import { formatUSD, low } from '@/lib/config';

interface TickerToken {
  symbol: string;
  price: number;
  change: number;
  logoURI: string;
  marketCap: number;
}

export function PriceTicker() {
  const [tokens, setTokens] = useState<TickerToken[]>([]);

  useEffect(() => {
    const loadTickerTokens = () => {
      const topTokens = getTopTokens(50);
      const cgStats = getCgStatsMap();
      
      const withStats = topTokens
        .map(({ token, stats }) => {
          const freshStats = cgStats.get(low(token.symbol)) || cgStats.get(low(token.name)) || stats;
          const price = freshStats?.price ?? 0;
          const change = freshStats?.change ?? 0;
          const volume = freshStats?.volume24h ?? 0;
          const marketCap = price && volume ? price * volume * 1000 : 0;
          
          return {
            symbol: token.symbol,
            price,
            change,
            logoURI: token.logoURI || freshStats?.image || '',
            marketCap,
            address: token.address,
          };
        })
        .filter((t) => t.price > 0 && t.change !== null);

      if (withStats.length === 0) return;

      const topByMarketCap = [...withStats]
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 7);

      const topByMove = [...withStats]
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 8);

      const seenAddresses = new Set<string>();
      const combined: TickerToken[] = [];
      
      topByMarketCap.forEach((t) => {
        if (!seenAddresses.has(t.address)) {
          combined.push(t);
          seenAddresses.add(t.address);
        }
      });
      
      topByMove.forEach((t) => {
        if (!seenAddresses.has(t.address)) {
          combined.push(t);
          seenAddresses.add(t.address);
        }
      });

      setTokens(combined);
    };

    loadTickerTokens();
    const priceInterval = setInterval(loadTickerTokens, 8000);

    return () => clearInterval(priceInterval);
  }, []);

  if (tokens.length === 0) return null;

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
