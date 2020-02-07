import Binance from 'node-binance-api'
import BinanceApiNode from 'binance-api-node'
import moment from 'moment'
import ApiInfo from '../../../app/Bot/api_info'
import underscore from 'underscore'
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
    let self = this
    return new Promise((resolve, reject) => {
      self.privateClient.balance((error, balances) => {
        if (error) {
          try {
            reject(JSON.parse(error.body).msg)
          } catch (e) {
            reject(e)
          }
        }
        var result = {}
        let currencies = Object.keys(balances)
        console.log(balances)
        let totalBTC = 0
        self.privateClient.prices((error, ticker) => {
          currencies.forEach(currency => {
            let value = parseFloat(balances[currency].available) + parseFloat(balances[currency].onOrder)
            var tickSymbol = `${currency}USDT`
            if (currency === 'USDT') {
              balances[currency].usdtValue = value
              result[currency] = balances[currency]
              return
            }
            if (!ApiInfo[tickSymbol]) {
              return
            }
            if (value === 0) return
            // if (currency !== 'BTC' && currency !== 'USDT') {
            //   totalBTC += (value * parseFloat(ticker[currency + 'BTC']) || 0)
            // } else if (currency === 'USDT') {
            //   console.log(value / parseFloat(ticker[tickSymbol]))
            //   totalBTC += value / parseFloat(ticker[tickSymbol])
            // } else {
            //   console.log(currency, value)
            //   totalBTC += value
            // }
            balances[currency].usdtValue = value * parseFloat(ticker[tickSymbol])
            if (balances[currency].usdtValue > 1) {
              result[currency] = balances[currency]
            }
          })
          console.log(totalBTC, ticker.BTCUSDT)
          resolve(result)
        })
      })
    })
  }

  async estimateBalance (res) {
    var balances = await this.accountInfo(res)
    console.log(balances)
    var result = 0
    Object.values(balances).forEach(each => result += each.usdtValue)
    return result
    // let self = this
    // return new Promise((resolve, reject) => {
    //   self.privateClient.balance((error, balances) => {
    //     if (error) {
    //       try {
    //         reject(JSON.parse(error.body).msg)
    //       } catch (e) {
    //         reject(e)
    //       }
    //     }
    //     let currencies = Object.keys(balances)
    //     let totalBTC = 0
    //     self.privateClient.prices((error, ticker) => {
    //       currencies.forEach(currency => {
    //         let value = parseFloat(balances[currency].available) + parseFloat(balances[currency].onOrder)
    //         if (value === 0) return
    //         if (currency !== 'BTC' && currency !== 'USDT') {
    //           totalBTC += (value * parseFloat(ticker[currency + 'BTC']) || 0)
    //         } else if (currency === 'USDT') {
    //           console.log(value / parseFloat(ticker.BTCUSDT))
    //           totalBTC += value / parseFloat(ticker.BTCUSDT)
    //         } else {
    //           console.log(currency, value)
    //           totalBTC += value
    //         }
    //       })
    //       console.log(totalBTC, ticker.BTCUSDT)
    //       resolve(totalBTC * parseFloat(ticker.BTCUSDT))
    //     })
    //   })
    // })
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

  async tradeHistory (symbol, fromId = null) {
    let data = {symbol}
    if (fromId !== null) {
      data.fromId = fromId
    }
    try {
      var history = await this.publicClient.myTrades(data)
      let result = underscore.sortBy(history, 'time').reverse().map(each => {
        return {
          'symbol': each.symbol, // "BNBUSDT",
          'id': each.id, // 17681672,
          'orderId': each.orderId, // 67373837,
          'orderListId': each.orderListId, // -1,
          'price': each.price, // "5.89700000",
          'qty': each.qty, // "1.62000000",
          'quoteQty': each.quoteQty, // "9.55314000",
          'commission': each.commission, // "0.00121363",
          'commissionAsset': each.commissionAsset, // "BNB",
          'time': moment(each.time).format('YYYY/MM/DD HH:mm:ss'), // 1546073453994,
          'isBuyer': each.isBuyer, // false,
          'isMaker': each.isMaker, // false,
          'isBestMatch': each.isBestMatch // true
        }
      })
      return result
    } catch (error) {
      console.log(error)
      return []
    }
  }
}
module.exports = BinancePrivateApi
