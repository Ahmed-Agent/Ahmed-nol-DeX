import fs from "fs";
import path from "path";

/**
 * Single source of truth for tokens
 * This file is dynamically updated when users search for new addresses
 * Prices are fetched ON-CHAIN and cached for 1 minute
 */
export function ensureTokenListExists() {
  const tokensPath = path.join(process.cwd(), "client", "src", "lib", "tokens.json");
  
  if (!fs.existsSync(tokensPath)) {
    const defaultTokens = {
      ethereum: [
        { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
        { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", name: "USDC", decimals: 6, logoURI: "https://assets.coingecko.com/coins/images/6319/large/usdc.png" }
      ],
      polygon: [
        { address: "0x0000000000000000000000000000000000001010", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png" },
        { address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", symbol: "USDC", name: "USDC", decimals: 6, logoURI: "https://assets.coingecko.com/coins/images/6319/large/usdc.png" }
      ]
    };
    fs.writeFileSync(tokensPath, JSON.stringify(defaultTokens, null, 2));
    console.log("[TokenUpdater] Created consolidated tokens.json");
  }
}

export function addTokenToList(chainId: number, token: { address: string; symbol: string; name: string; decimals: number }) {
  const tokensPath = path.join(process.cwd(), "client", "src", "lib", "tokens.json");
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
    const chainKey = chainId === 1 ? "ethereum" : "polygon";
    
    if (!tokens[chainKey]) tokens[chainKey] = [];
    
    const exists = tokens[chainKey].find((t: any) => t.address.toLowerCase() === token.address.toLowerCase());
    if (!exists) {
      tokens[chainKey].push({
        address: token.address.toLowerCase(),
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: ""
      });
      fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
      console.log(`[TokenUpdater] Added new token ${token.symbol} to ${chainKey} list`);
      return true;
    }
  } catch (e) {
    console.error("[TokenUpdater] Error adding token:", e);
  }
  return false;
}
