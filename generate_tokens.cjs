const fs = require('fs');

async function fetchTopTokens(network) {
    console.log(`Fetching top tokens for ${network}...`);
    try {
        const category = network === 'ethereum' ? 'ethereum-ecosystem' : 'polygon-ecosystem';
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${category}&order=market_cap_desc&per_page=500&page=1`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        return {
            timestamp: new Date().toISOString(),
            tokens: data.map(coin => ({
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                image: coin.image,
                current_price: coin.current_price,
                market_cap: coin.market_cap,
                market_cap_rank: coin.market_cap_rank,
                address: (coin.platforms?.[network === 'ethereum' ? 'ethereum' : 'polygon-pos'] || '').toLowerCase(),
                decimals: 18
            })).filter(t => t.address)
        };
    } catch (error) {
        console.error(`Error fetching ${network}:`, error);
        return { tokens: [] };
    }
}

async function run() {
    const ethData = await fetchTopTokens('ethereum');
    const polData = await fetchTopTokens('polygon');
    
    fs.writeFileSync('eth-tokens.json', JSON.stringify(ethData, null, 2));
    fs.writeFileSync('polygon-tokens.json', JSON.stringify(polData, null, 2));
    
    if (!fs.existsSync('client/public')) {
        fs.mkdirSync('client/public', { recursive: true });
    }
    fs.copyFileSync('eth-tokens.json', 'client/public/eth-tokens.json');
    fs.copyFileSync('polygon-tokens.json', 'client/public/polygon-tokens.json');
    
    console.log('Token files generated successfully.');
}

run();
