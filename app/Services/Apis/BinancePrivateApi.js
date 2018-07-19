import Binance from 'node-binance-api'
class BinancePrivateApi {
  constructor (apiKey, apiSecret) {
    // Authenticated client, can make signed calls
    this.privateClient = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      test: !process.env.REAL_API,
      useServerTime: true

    })
  }
  verifyOrder (data) {
    return data.quantity > 0 && data.pair && (data.mode === 'sell' || data.mode === 'buy')
  }
  allOrders () {
    return new Promise((resolve, reject) => {
      this.privateClient.openOrders(false, (error, openOrders) => {
        if (error) {
          reject(JSON.parse(error.body).msg)
        }
        resolve(openOrders)
      })
    })
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

  placeMarket (data) {
    return new Promise((resolve, reject) => {
      if (!this.verifyOrder(data)) {
        reject(new Error('invalid order data'))
        return
      }
      let callback = (error, response) => {
        if (error) {
          reject(JSON.parse(error.body).msg)
          return
        }
        console.log(`Market ${data.mode} response`, response)
        console.log('order id: ' + response.orderId)
        let total = 0
        if (response.fills) {
          response.fills.forEach(element => {
            total += parseFloat(element.price) * parseFloat(element.qty)
          })
        } else {
          total = data.price
          response.executedQty = 1
        }
        response.price = total / parseFloat(response.executedQty)
        resolve(response)
      }
      if (data.mode === 'sell') {
        this.privateClient.marketSell(data.pair, data.quantity, callback)
      } else if (data.mode === 'buy') {
        this.privateClient.marketBuy(data.pair, data.quantity, callback)
      }
    })
  }
  placeLimit (data = {}) {
    console.log('data', data)
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
    return new Promise((resolve, reject) => {
      if (!this.verifyOrder(data)) {
        reject(new Error('invalid order data'))
        return
      }
      let callback = (error, response) => {
        if (error) {
          console.log('error', error.body)
          reject(JSON.parse(error.body).msg)
          return
        }
        console.log(`${data.options.type} ${data.mode} response`, response)
        console.log('order id: ' + response.orderId)
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
