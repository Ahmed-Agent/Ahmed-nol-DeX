import fs from "fs";
import path from "path";

const COINGECKO_API_KEY = process.env.VITE_COINGECKO_API_KEY || "";
const CMC_API_KEY = process.env.VITE_CMC_API_KEY || "";
const COINAPI_KEY = process.env.VITE_COINAPI_KEY || "";

async function fetchCoinGeckoTokens(chainId: number, platform: string, limit: number) {
  try {
    const baseUrl = "https://api.coingecko.com/api/v3";
    const authParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : "";
    const allTokens = [];
    
    // Fetch 2 pages to get up to 500 tokens (we need 450)
    for (let page = 1; page <= 2; page++) {
      const url = `${baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}${authParam}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data)) allTokens.push(...data);
    }

    return allTokens.map((coin: any) => {
      let address = coin.platforms?.[platform];
      if (platform === "polygon-pos") {
        address = coin.platforms?.["polygon-pos"] || coin.platforms?.["matic-network"] || coin.platforms?.["matic"];
      }
      if (!address) return null;
      return {
        address: address.toLowerCase(),
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        decimals: 18,
        chainId,
        logoURI: coin.image,
        marketCap: coin.market_cap
      };
    }).filter(t => t !== null);
  } catch (e) {
    return [];
  }
}

export async function updateTokenLists() {
  console.log("Fetching tokens from multi-sources (CoinGecko + CMC + CoinAPI)...");
  
  // CoinGecko is primary for addresses
  const ethCG = await fetchCoinGeckoTokens(1, "ethereum", 500);
  const polCG = await fetchCoinGeckoTokens(137, "polygon-pos", 500);

  const deduplicate = (tokens: any[]) => {
    const seen = new Set();
    return tokens.filter(t => {
      if (seen.has(t.address)) return false;
      seen.add(t.address);
      return true;
    }).sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 450);
  };

  const finalEth = deduplicate(ethCG);
  const finalPol = deduplicate(polCG);

  // Save to root
  fs.writeFileSync("eth-tokens.json", JSON.stringify(finalEth, null, 2));
  fs.writeFileSync("polygon-tokens.json", JSON.stringify(finalPol, null, 2));
  
  // Copy to public for frontend access
  const publicDir = path.join(process.cwd(), "client", "public");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync("eth-tokens.json", path.join(publicDir, "eth-tokens.json"));
  fs.copyFileSync("polygon-tokens.json", path.join(publicDir, "polygon-tokens.json"));

  // Unified file for defaults
  const combined = [...finalEth, ...finalPol];
  fs.writeFileSync("tokens-900.json", JSON.stringify(combined, null, 2));
  
  console.log(`Saved ${finalEth.length} ETH and ${finalPol.length} POL tokens (900 total).`);
}
