const COINGECKO_IDS = 'bitcoin,litecoin,dogecoin,monero,ethereum-classic,bitcoin-cash,ravencoin,kaspa,zcash'; // Add more PoW coins as needed
let miningData = {};
let coingeckoPrices = {};
let coingeckoMarket = [];

async function loadData() {
  document.getElementById('loading').textContent = 'Fetching mining & price data...';
  
  try {
    // WhatToMine coins
    const wtmRes = await fetch('https://whattomine.com/coins.json');
    const wtm = await wtmRes.json();
    miningData = wtm.coins || {};

    // CoinGecko prices & market
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`);
    coingeckoPrices = await priceRes.json();

    const marketRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + COINGECKO_IDS + '&order=market_cap_desc&per_page=50&page=1&sparkline=true');
    coingeckoMarket = await marketRes.json();

    displayCoins();
  } catch (err) {
    document.getElementById('loading').textContent = 'Error loading data. Check connection or try later.';
    console.error(err);
  }
}

function displayCoins() {
  const grid = document.getElementById('coins-grid');
  grid.innerHTML = '';
  document.getElementById('loading').classList.add('hidden');
  grid.classList.remove('hidden');

  coingeckoMarket.forEach(coin => {
    const card = document.createElement('div');
    card.className = 'coin-card';
    const priceData = coingeckoPrices[coin.id] || {};
    const change = priceData.usd_24h_change || 0;
    const changeClass = change > 0 ? 'change-positive' : 'change-negative';

    // Find sparkline data
    const canvasId = `spark-${coin.id}`;
    card.innerHTML = `
      <div class="coin-name">\( {coin.name} ( \){coin.symbol.toUpperCase()})</div>
      <div class="price">\[ {coin.current_price?.toLocaleString() || 'N/A'}</div>
      <p>24h: <span class="\( {changeClass}"> \){change.toFixed(2)}%</span></p>
      <p>Market Cap: \]{coin.market_cap?.toLocaleString() || 'N/A'}</p>
      <canvas id="${canvasId}" width="200" height="80"></canvas>
    `;
    grid.appendChild(card);

    // Sparkline chart
    if (coin.sparkline_in_7d?.price?.length > 0) {
      new Chart(document.getElementById(canvasId), {
        type: 'line',
        data: { datasets: [{ data: coin.sparkline_in_7d.price, borderColor: '#60a5fa', borderWidth: 2, fill: false, pointRadius: 0 }] },
        options: { scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } }, elements: { line: { tension: 0.4 } } }
      });
    }
  });
}

async function calculateProfits() {
  const elecCost = parseFloat(document.getElementById('elec-cost').value) || 0.12;
  const hashrate = parseFloat(document.getElementById('hashrate').value) || 100;
  const power = parseFloat(document.getElementById('power').value) || 1500;

  const dailyPowerCostUSD = (power / 1000) * 24 * elecCost;

  let html = '<h3>Estimated Daily Profits (USD) – After Electricity</h3><p>Note: Simplified; assumes linear scaling & no pool fees/hardware depreciation.</p>';

  // Example: Loop over some WhatToMine coins (you can filter by algorithm if you add more inputs)
  Object.values(miningData).slice(0, 8).forEach(coin => {  // Top \~8 for demo
    const revenuePerUnitDay = coin.estimated_rewards || 0;  // rewards per unit hash/day
    const unit = 'MH/s'; // Assume; in real app, match to coin.algorithm
    const dailyRevenueUSD = hashrate * revenuePerUnitDay;
    const dailyProfitUSD = dailyRevenueUSD - dailyPowerCostUSD;

    html += `
      <p><strong>\( {coin.name} ( \){coin.tag})</strong>: \[ {dailyProfitUSD.toFixed(2)} 
        <span class="${dailyProfitUSD > 0 ? 'profit-positive' : 'profit-negative'}">
          (\( {dailyProfitUSD > 0 ? '+' : ''} \){dailyProfitUSD.toFixed(2)} USD)
        </span> (Power cost: \]{dailyPowerCostUSD.toFixed(2)})</p>
    `;
  });

  document.getElementById('results').innerHTML = html || '<p>No mining data available yet.</p>';
}

// Init & refresh
loadData();
setInterval(loadData, 60000);
