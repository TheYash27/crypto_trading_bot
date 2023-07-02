require('dotenv').config({ path: '.env' })
const ccxt = require('ccxt')
const axios = require('axios')

const tick = async () => {
    const { asset, base, allocation, spread } = config
    const market = `${asset}/${base}`

    const orders = await binanceClient.fetchOpenOrders(market)
    orders.forEach(async order => {
        await binanceClient.cancelOrder(order.id)
    })

    const results = await Promise.all([
        //Get the price feed of BTC/USD from the CoinGecko API....
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
        //....and the price feed of USDT/USD from the CoinGecko API
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
    ])
    const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd

    const sellPrice = marketPrice * (1 + spread)
    const buyPrice = marketPrice * (1 - spread)
    const balances = await binanceClient.fetchBalance()
    const assetBalance = balances.free[asset]
    const baseBalance = balances.free[base]
    const sellVolume = assetBalance * allocation
    const buyVolume = (baseBalance * allocation) / marketPrice
    
    await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice)
    await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice)

    console.log(`
        Congratulations! A new tick has been exec.d for ${market}....
        Jus created a new lim. sell order for ${sellVolume} @ ${sellPrice},....
        and a new lim. buy order for ${buyVolume} @ ${buyPrice}
    `)
}

const run = () => {
    const config = {
        asset: 'BTC',
        base: 'USDT',
        allocation: 0.5,// What fraction of our portfolio do we want to put for this trade pair?
        spread: 0.1,// Buy and Sell orders' lim. w.r.t base token's price
        tickInterval: 3e4// Time Period betw. 2 consec. exec.s of the tick func. 
    }
    const binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET
    })
    tick(config, binanceClient)
    setInterval(tick, config.tickInterval, config, binanceClient)
}

run()
