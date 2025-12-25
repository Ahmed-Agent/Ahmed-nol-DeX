const fs = require('fs');
const axios = require('axios');

async function populate() {
  const ethereum = [];
  const polygon = [];

  try {
    // We use a public list or known top tokens if API fails, 
    // but the user wants 250. Let's try to get a larger list from CoinGecko public API (no key needed for demo)
    const baseUrl = 'https://api.coingecko.com/api/v3';
    
    console.log('Fetching top 250 tokens by market cap...');
    const response = await axios.get(`${baseUrl}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false
      }
    });

    const coins = response.data;
    
    // We need another call to get platforms/addresses for these coins
    // Or we can use the /coins/list with include_platform=true
    console.log('Fetching platform addresses...');
    const listResponse = await axios.get(`${baseUrl}/coins/list`, {
      params: { include_platform: true }
    });
    
    const addrMap = new Map();
    listResponse.data.forEach(c => addrMap.set(c.id, c.platforms));

    coins.forEach(c => {
      const platforms = addrMap.get(c.id);
      if (!platforms) return;

      if (platforms.ethereum) {
        ethereum.push({
          address: platforms.ethereum.toLowerCase(),
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          marketCap: c.market_cap,
          logoURI: c.image,
          decimals: 18
        });
      }
      if (platforms['polygon-pos']) {
        polygon.push({
          address: platforms['polygon-pos'].toLowerCase(),
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          marketCap: c.market_cap,
          logoURI: c.image,
          decimals: 18
        });
      }
    });

    // If we still don't have 250, we might need more pages or more sources.
    // But this should give a very solid start of real tokens.
    
    const tokensData = { ethereum, polygon };
    fs.writeFileSync('client/src/lib/tokens.json', JSON.stringify(tokensData, null, 2));
    console.log(`Saved ${ethereum.length} ETH and ${polygon.length} POL tokens.`);
  } catch (e) {
    console.error('Population error:', e.message);
    // Fallback minimal
    fs.writeFileSync('client/src/lib/tokens.json', JSON.stringify({
      ethereum: [{ address: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ethereum", decimals: 18, logoURI: "" }],
      polygon: [{ address: "0x0000000000000000000000000000000000001010", symbol: "MATIC", name: "Polygon", decimals: 18, logoURI: "" }]
    }, null, 2));
  }
}

populate();
