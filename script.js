const COINS = ['bitcoin', 'litecoin', 'kaspa', 'dogecoin', 'monero']; // Add more mineable ones
const WHAT_TO_MINE_URL = 'https://whattomine.com/coins.json';
let miningData = {};

// Fetch WhatToMine data once
async function loadMiningData() {
  try {
    const res = await fetch(WHAT_TO_MINE_URL);
    const data = await res.json();
    miningData = data.coins; // Object with coin keys
  } catch (err) {
    console.error('WhatToMine fetch failed:', err);
  }
}

// Fetch prices from CoinGecko (supports NGN!)
async function fetchPrices() {
  const ids = COINS.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn&include_24hr_change=true`;
  
  try {
    const res = await fetch(url);
    const prices = await res.json();
    
    // Also fetch market data for top coins (per_page=10, but filter mineable)
    const marketsRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true');
    const markets = await marketsRes.json();

    displayMarket(markets, prices);
  } catch (err) {
    document.getElementById('coins-grid').innerHTML = '<p>Error loading data... Try refresh.</p>';
  }
}

function displayMarket(markets, prices) {
  const grid = document.getElementById('coins-grid');
  grid.innerHTML = '';

  COINS.forEach(coinId => {
    const coinData = markets.find(c => c.id === coinId);
    if (!coinData) return;

    const p = prices[coinId];
    const card = document.createElement('div');
    card.className = 'coin-card';
    card.innerHTML = `
      <h3>\( {coinData.name} ( \){coinData.symbol.toUpperCase()})</h3>
      <p>\[ {p.usd.toLocaleString()} ≈ ₦${p.ngn.toLocaleString()}</p>
      <p>24h: <span style="color:${p.ngn_24h_change > 0 ? '#22c55e' : '#ef4444'}">
        ${p.ngn_24h_change.toFixed(2)}%</span></p>
      <small>Market Cap: \]{coinData.market_cap.toLocaleString()}</small>
    `;
    grid.appendChild(card);
  });
}

// Profit calc (simplified – uses WhatToMine estimated_rewards per unit)
async function calculateProfits() {
  if (Object.keys(miningData).length === 0) {
    await loadMiningData();
  }

  const elecCostNGN = parseFloat(document.getElementById('elec-cost').value) || 80;
  const powerW = parseFloat(document.getElementById('power').value) || 1500;
  const dailyPowerCostNGN = (powerW / 1000) * 24 * elecCostNGN;

  let html = '<h3>Estimated Daily Profits (NGN) - After Power Cost</h3>';

  for (let coinId of COINS) {
    // Map CoinGecko id to WhatToMine tag (approximate – you can refine)
    const wtmTagMap = {
      bitcoin: 'Bitcoin-SHA256',
      litecoin: 'Litecoin-Scrypt',
      kaspa: 'Kaspa-kHeavyHash', // Check actual tags in miningData
      dogecoin: 'Dogecoin-Scrypt',
      monero: 'Monero-RandomX'
    };
    const tag = wtmTagMap[coinId] || coinId.charAt(0).toUpperCase() + coinId.slice(1);
    const coin = Object.values(miningData).find(c => c.tag.toLowerCase().includes(coinId) || c.name.toLowerCase().includes(coinId));

    if (!coin) continue;

    // estimated_rewards is rewards per some unit (e.g., per MH/s or GH/s) – adjust factor
    // For simplicity, assume user's hash rate scales linearly (real mining needs algorithm match!)
    const assumedHashFactor = 1; // Customize per algo (e.g., for GPU MH/s)
    const dailyRevenueUSD = coin.estimated_rewards * assumedHashFactor * 24; // Rough!
    const dailyRevenueNGN = dailyRevenueUSD * (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=ngn`).then(r=>r.json()).then(d=>d[coinId].ngn));

    const profitNGN = dailyRevenueNGN - dailyPowerCostNGN;

    html += `
      <p><strong>\( {coin.name}</strong>: ₦ \){profitNGN.toFixed(2)} 
        <span class="${profitNGN > 0 ? 'profit-positive' : 'profit-negative'}">
          (\( {profitNGN > 0 ? '+' : ''} \){profitNGN.toFixed(2)} NGN)
        </span></p>
    `;
  }

  document.getElementById('results').innerHTML = html || '<p>No data for selected coins yet.</p>';
}

// Init
loadMiningData();
fetchPrices();
setInterval(fetchPrices, 60000); // Refresh prices
