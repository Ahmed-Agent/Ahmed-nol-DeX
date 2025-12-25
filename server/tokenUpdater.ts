import fs from "fs";
import path from "path";
import axios from "axios";

const CMC_API_KEY = process.env.VITE_CMC_API_KEY || "";
const COINGECKO_API_KEY = process.env.VITE_COINGECKO_API_KEY || "";

async function fetchCMC(chainId: number) {
  if (!CMC_API_KEY) return [];
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
      params: { limit: 1000, convert: 'USD', aux: 'platform,symbol,name' },
      headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY, 'Accept': 'application/json' }
    });
    const platformId = chainId === 1 ? 1 : 137;
    return response.data.data
      .filter((c: any) => (c.platform?.id === platformId || c.platform?.name?.toLowerCase() === (chainId === 1 ? 'ethereum' : 'polygon')) && c.platform?.token_address)
      .map((c: any) => ({
        address: c.platform.token_address.toLowerCase(),
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        marketCap: c.quote.USD.market_cap,
        logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
        decimals: 18
      }));
  } catch (e: any) {
    console.error(`CMC error ${chainId}:`, e.message);
    return [];
  }
}

async function fetchCG(platform: string) {
  const tokens: any[] = [];
  const baseUrl = 'https://api.coingecko.com/api/v3';
  // Use demo key if provided, otherwise try public (limited)
  const headers = COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {};
  try {
    console.log(`Fetching top tokens for ${platform} from CoinGecko...`);
    // First get markets to pick top tokens
    const marketsUrl = `${baseUrl}/coins/markets?vs_currency=usd&category=${platform}-ecosystem&order=market_cap_desc&per_page=250&page=1`;
    const mRes = await fetch(marketsUrl, { headers });
    if (!mRes.ok) throw new Error(`CG markets failed: ${mRes.status}`);
    const marketsData = await mRes.json() as any[];
    
    // Then get platform addresses
    const listUrl = `${baseUrl}/coins/list?include_platform=true`;
    const lRes = await fetch(listUrl, { headers });
    if (!lRes.ok) throw new Error(`CG list failed: ${lRes.status}`);
    const listData = await lRes.json() as any[];
    const addrMap = new Map();
    listData.forEach((c: any) => addrMap.set(c.id, c.platforms));

    marketsData.forEach((c: any) => {
      const platforms = addrMap.get(c.id);
      if (!platforms) return;
      const addr = (platforms[platform === 'ethereum' ? 'ethereum' : 'polygon-pos'] || '').toLowerCase();
      if (addr) {
        tokens.push({
          address: addr,
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          marketCap: c.market_cap,
          logoURI: c.image,
          decimals: 18
        });
      }
    });
  } catch (e: any) { console.error(`CG error for ${platform}:`, e.message); }
  return tokens;
}

const ETH_FALLBACK = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", name: "USDC", decimals: 6, logoURI: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" }
];

const POL_FALLBACK = [
  { address: "0x0000000000000000000000000000000000001010", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png" },
  { address: "0x2791bca1f2de4661ed88a30c99a7a9449Aa84174", symbol: "USDC", name: "USDC", decimals: 6, logoURI: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" }
];

export async function updateTokenLists() {
  console.log("Updating local tokens.json...");
  const [ethCMC, polCMC, ethCG, polCG] = await Promise.all([
    fetchCMC(1),
    fetchCMC(137),
    fetchCG('ethereum'),
    fetchCG('polygon')
  ]);

  const dedupe = (list1: any[], list2: any[], fallback: any[]) => {
    const combined = [...list1, ...list2, ...fallback];
    const seen = new Set();
    return combined.filter(t => {
      if (!t.address || seen.has(t.address)) return false;
      seen.add(t.address);
      return true;
    }).sort((a,b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 250);
  };

  const ethereum = dedupe(ethCMC, ethCG, ETH_FALLBACK);
  const polygon = dedupe(polCMC, polCG, POL_FALLBACK);
  
  fs.writeFileSync(path.join(process.cwd(), "client", "src", "lib", "tokens.json"), JSON.stringify({ ethereum, polygon }, null, 2));
  console.log(`Saved ${ethereum.length} ETH and ${polygon.length} POL tokens.`);
}
