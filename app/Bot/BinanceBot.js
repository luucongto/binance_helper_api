import Binance from 'node-binance-api'
import BinancePrivateApi from '../Services/Apis/BinancePrivateApi'

import {BinanceUser, UserOrder} from '../Models'
class BinanceBot {
  constructor () {
    // Authenticated client, can make signed calls
    this.binance = new Binance()
    this.pairs = []
    this.trailingStopOrders = {}

    this.watch = this.watch.bind(this)
    this.addTrailingStopOrder = this.addTrailingStopOrder.bind(this)
    this.setup()
  }

  setup () {
    console.log('Initializing....')
    // List all endpoints
    let endpoints = this.binance.websockets.subscriptions()
    for (let endpoint in endpoints) {
      console.log('Terminating...', endpoint)
	    this.binance.websockets.terminate(endpoint)
    }
    let self = this
    console.log('Setup watching list....')
    UserOrder.findAll({where: {status: 'watching'}}).then(result => {
      self.addTrailingStopOrder(result, true)
      return result
    }).catch(error => {
      console.error(error)
      throw (new Error('placeOrder'))
    })
    console.log('Watching....')
  }

  watch (trades) {
    let {
      s: symbol,
      p: price,
      q: quantity
    } = trades
    price = parseFloat(price)
    quantity = parseFloat(quantity)
    console.log(`${symbol} trade updated. price ${price}x${quantity} watching ${this.trailingStopOrders[symbol] ? Object.keys(this.trailingStopOrders[symbol]) : null}`)
    if (this.trailingStopOrders[symbol]) {
      Object.values(this.trailingStopOrders[symbol]).forEach(e => {
        if (e.status !== 'watching') return
        switch (e.mode) {
          case 'sell':
            if (price < e.expect_price) return
            if (!e.offset) e.offset = price - e.expect_price
            if (e.price + e.offset <= price) {
              e.price = price - e.offset
              console.log(`expect order ${e.id} ${e.mode} at ${e.price} offset ${e.offset}`)
              // save to db
              e.save()
            } else if (e.price > price) {
              // trigger sell market
              e.status = 'ordering'
              console.log(`trigger order ${e.id} market ${e.mode} at ${price} offset ${e.offset} `)
              this.order(e).then(response => {
                e.price = response.price
                e.status = 'done'
                e.save()
                delete this.trailingStopOrders[symbol][e.id]
              })
            }
            break
          case 'buy':
            if (price > e.expect_price) return
            if (!e.offset) e.offset = e.expect_price - price
            if (e.price - e.offset >= price) {
              e.price = price + e.offset
              console.log(`expect order ${e.id} ${e.mode} at ${e.price} offset ${e.offset}`)
              // save to db
              e.save()
            } else if (e.price < price) {
              // trigger sell market
              e.status = 'ordering'
              console.log(`trigger order ${e.id} market ${e.mode} at ${price} offset ${e.offset} `)
              this.order(e).then(response => {
                e.price = response.price
                e.status = 'done'
                e.save()
                delete this.trailingStopOrders[symbol][e.id]
              })
            }
            break
        }
      })
    }
  }
  order (orderData) {
    return BinanceUser.findByPrimary(orderData.user_id).then(binanceUser => {
      let privateClient = new BinancePrivateApi(binanceUser.api_key, binanceUser.api_secret)
      return privateClient.placeMarket(orderData)
    })
  }

  addTrailingStopOrder (orders, clear = false) {
    if (clear) {
      this.trailingStopOrders = {}
    }
    orders.forEach(data => {
      if (this.trailingStopOrders[data.pair]) {
        this.trailingStopOrders[data.pair][data.id] = data
      } else {
        this.trailingStopOrders[data.pair] = {}
        this.trailingStopOrders[data.pair][data.id] = data
        if(this.pairs.indexOf(data.pair) < 0) {
          this.pairs.push(data.pair)
          console.log('Setup Socket....')
          let self = this
          this.binance.websockets.trades([data.pair], (trades) => {
            self.watch(trades)
          })
        }
      }
    })
  }
}

const instance = new BinanceBot()
// Object.freeze(instance)

export default instance
