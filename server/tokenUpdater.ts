import fs from "fs";
import path from "path";

const COINGECKO_API_KEY = process.env.VITE_COINGECKO_API_KEY || "";

async function fetchTokens(chainId: number, platform: string, limit: number) {
  try {
    // Force standard api.coingecko.com for Demo keys as per error message
    const baseUrl = "https://api.coingecko.com/api/v3";
    const authParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : "";
    
    // Using platform filter in coins/markets
    const url = `${baseUrl}/coins/markets?vs_currency=usd&category=${platform === 'ethereum' ? 'ethereum-ecosystem' : 'polygon-ecosystem'}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false${authParam}`;
    
    console.log(`Fetching ${platform} tokens from: ${url.replace(COINGECKO_API_KEY, '***')}`);
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${err}`);
    }
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
    }

    return data.map((coin: any) => {
      const address = coin.platforms?.[platform === 'ethereum' ? 'ethereum' : 'polygon-pos'];
      if (!address) return null;
      
      return {
        address: address.toLowerCase(),
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        decimals: 18, // Simplified, will be updated on-chain
        chainId,
        logoURI: coin.image
      };
    }).filter((t: any) => t !== null);
  } catch (error) {
    console.error(`Error fetching ${platform} tokens:`, error);
    return [];
  }
}

export async function updateTokenLists() {
  console.log("Updating token lists (450 per chain)...");
  const ethTokens = await fetchTokens(1, "ethereum", 450);
  const polTokens = await fetchTokens(137, "polygon-pos", 450);
  
  if (ethTokens.length > 0) {
    fs.writeFileSync(path.join(process.cwd(), "eth-tokens.json"), JSON.stringify(ethTokens, null, 2));
    console.log(`Saved ${ethTokens.length} ETH tokens`);
  }
  
  if (polTokens.length > 0) {
    fs.writeFileSync(path.join(process.cwd(), "polygon-tokens.json"), JSON.stringify(polTokens, null, 2));
    console.log(`Saved ${polTokens.length} POL tokens`);
  }
}
