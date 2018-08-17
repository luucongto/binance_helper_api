// import Binance from 'node-binance-api'
import BinanceApiNode from 'binance-api-node'
import {BinanceTradeHistory} from '../app/Models/index'
let apiKey = 'hkzVBprJDnUx4phasrSHXlqd0YWMof62QRClA2LBiKfuA9c6gF63SoNF2XByEfNi'
let apiSecret = 'IfaafTPSdhvX28jtabBACIAF0pSACPcbanXGV9ot4X34CGzMiUeMCht2kjCRzEss'
// let privateClient = new Binance().options({
//   APIKEY: apiKey,
//   APISECRET: apiSecret
// })
let client = BinanceApiNode({apiKey, apiSecret})
let TIMEOUT = 5000
let craw = (asset, currency) => {
  BinanceTradeHistory.findOne({
    where: {
      asset, currency
    },
    order: [
      ['id', 'desc']
    ],
    limit: 1
  }).then(history => {
    console.log(`Start ${asset + currency} from ${history ? history.id : 0}`)
    let query = {symbol: asset + currency, fromId: 0}
    if (history) {
      query.fromId = history.id + 1
    }
    return client.tradesHistory(query)
  }).then(results => {
    console.log(`Catch ${asset + currency} num ${results.length}`)
    if (results.length === 0) {
      return null
    }
    results.forEach(element => {
      element.asset = asset
      element.currency = currency
    })
    return BinanceTradeHistory.bulkCreate(results).then(() => {
      setTimeout(() => {
        craw(asset, currency)
      }, TIMEOUT)
    })
  })
}

craw('BNB', 'USDT')
