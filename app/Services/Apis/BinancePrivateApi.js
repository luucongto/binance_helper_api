import Binance from 'node-binance-api'
import BinanceApiNode from 'binance-api-node'
import ApiInfo from '../../../app/Bot/api_info'
class BinancePrivateApi {
  constructor (apiKey, apiSecret) {
    // Authenticated client, can make signed calls
    this.privateClient = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      test: !process.env.REAL_API,
      useServerTime: true

    })
    this.publicClient = BinanceApiNode({
      apiKey: apiKey,
      apiSecret: apiSecret
    })
  }
  verifyOrder (data) {
    return data.quantity > 0 && data.pair && (data.mode === 'sell' || data.mode === 'buy')
  }
  allPrices () {
    return this.publicClient.prices()
  }
  accountInfo (res) {
    return new Promise((resolve, reject) => {
      this.privateClient.balance((error, balances) => {
        if (error) {
          reject(JSON.parse(error.body).msg)
        }
        resolve(balances)
      })
    })
  }

  placeMarket (orderParams) {
    return new Promise((resolve, reject) => {
      if (!this.verifyOrder(orderParams)) {
        reject(new Error('invalid order data'))
        return
      }
      let callback = (error, response) => {
        if (error) {
          reject(JSON.parse(error.body).msg)
          return
        }
        console.warn('NODEAPP', `OrderMarket ${JSON.stringify(orderParams)}\norg response ${JSON.stringify(response)}`)
        let total = 0
        if (response.fills) {
          response.fills.forEach(element => {
            total += parseFloat(element.price) * parseFloat(element.qty)
          })
        } else {
          total = orderParams.price
          response.executedQty = 1
        }
        response.price = total / parseFloat(response.executedQty)
        response.executedQty = parseFloat(response.executedQty)
        console.warn('NODEAPP', `calculated response ${JSON.stringify(response)}`)
        resolve(response)
      }
      let filter = ApiInfo[orderParams.pair]
      if (orderParams.quantity < filter.minQty || orderParams.quantity > filter.maxQty) {
        return
      }
      let oldQty = orderParams.quantity
      let newQty = orderParams.quantity - (orderParams.quantity % filter.stepSize)
      if (Math.abs((oldQty - newQty)) < oldQty * 0.05) {
        orderParams.quantity = newQty
      }
      if (orderParams.mode === 'sell') {
        this.privateClient.marketSell(orderParams.pair, parseFloat(orderParams.quantity), callback)
      } else if (orderParams.mode === 'buy') {
        this.privateClient.marketBuy(orderParams.pair, parseFloat(orderParams.quantity), callback)
      }
    })
  }
  placeLimit (data = {}) {
    data.options = {
      type: 'LIMIT'
    }
    return this._placeOrder(data)
  }
  placeStoploss (data) {
    data.options = {
      stopPrice: data.stopPrice,
      type: 'STOP_LOSS'
    }
    return this._placeOrder(data)
  }
  _placeOrder (data) {
    console.warn('NODEAPP', `Order ${JSON.stringify(data)}`)
    return new Promise((resolve, reject) => {
      if (!this.verifyOrder(data)) {
        reject(new Error('invalid order data'))
        return
      }
      let callback = (error, response) => {
        if (error) {
          console.error('NODEAPP', `[BinancePrivateApi] ${JSON.stringify(data)} ${JSON.stringify(error.body)}`)
          reject(JSON.parse(error.body).msg)
          return
        }

        console.warn('NODEAPP', `Order: ${data.id} response: ${JSON.stringify(response)}`)
        resolve(response)
      }
      if (data.mode === 'sell') {
        this.privateClient.sell(data.pair, data.quantity, data.price, data.options, callback)
      } else if (data.mode === 'buy') {
        this.privateClient.buy(data.pair, data.quantity, data.price, data.options, callback)
      }
    })
  }
}
module.exports = BinancePrivateApi
