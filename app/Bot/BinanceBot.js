import Binance from 'node-binance-api'
import BinancePrivateApi from '../Services/Apis/BinancePrivateApi'
import BinanceTestTrade from './BinanceTestTrade'
import {BinanceUser, UserOrder} from '../Models'
import {Op} from 'sequelize'
class BinanceBot {
  constructor () {
    // Authenticated client, can make signed calls
    this.binance = new Binance()
    this.pairs = []
    this.watchingSockets = {}
    this.activeUsers = {}
    this.watch = this.watch.bind(this)
  }
  _refresh (userId) {
    let self = this
    UserOrder.findAll({
      where: {
        user_id: userId
      }
    }).then(orders => {
      self.emitOrders(userId, orders)
    })
  }
  emitOrders (userId, orders) {
    if (!userId) {
      console.error('Emit order null userid')
    }
    if (this.activeUsers[userId] && this.activeUsers[userId].socket) {
      this.activeUsers[userId].socket.emit('update_order', orders)
    }
  }
  setUser (data) {
    let self = this
    if (this.activeUsers[data.id]) {
      this.activeUsers[data.id].socket = data.socket
    } else {
      this.activeUsers[data.id] = {
        socket: data.socket,
        api: null
      }
    }
    this._refresh(data.id)
    data.socket.on('update_order', params => {
      switch (params.command) {
        case 'placeOrder':
          UserOrder.create({
            user_id: data.id,
            asset: params.asset,
            currency: params.currency,
            pair: params.asset + params.currency,
            price: parseFloat(params.expect_price || 0),
            quantity: parseFloat(params.quantity),
            mode: params.mode,
            type: params.type,
            status: 'waiting',
            offset: parseFloat(params.offset || 0),
            expect_price: parseFloat(params.expect_price || 0)
          }).then(order => {
            self.setupOne(order)
            self.emitOrders(order.user_id, [order])
          })
          break
        case 'updateOrder':
          UserOrder.findById(params.id).then(order => {
            if (order) {
              order.status = params.status
              self.updateOne(order)
              order.save().then(order => {
                self.emitOrders(order.user_id, [order])
              })
            }
          })
          break
        case 'refresh':
          self._refresh(data.id)
          break
      }
    })
  }
  start () {
    console.log('Initializing.... REAL: ' + process.env.REAL_API)
    let self = this
    console.log('Setup watching list....')
    UserOrder.findAll({where: {
      status: {
        [Op.in]: ['waiting', 'watching']
      }}}).then(orders => {
        if (orders.length) {
          orders.forEach(order => self.setupOne(order))
        }
        return orders
      }).catch(error => {
        console.error(error)
        throw (new Error('placeOrder'))
      })
    console.log('Watching....')
  }

  setupOne (order, api) {
    if (this.watchingSockets[order.pair] && this.watchingSockets[order.pair].orders[order.id]) {
      console.log(`order ${order.id} duplicated`)
      return
    }
    let self = this
    if (!this.activeUsers[order.user_id]) {
      this.activeUsers[order.user_id] = {socket: null, api: null}
    }
    if (api) {
      this.activeUsers[order.user_id].api = api
    }
    if (this.watchingSockets[order.pair]) {
      this.watchingSockets[order.pair].orders[order.id] = order
    } else {
      let watchingSocketID = this.binance.websockets.trades([order.pair], (trades) => {
        self.watch(trades)
      })
      let orders = {}
      orders[order.id] = order
      this.watchingSockets[order.pair] = {
        id: watchingSocketID,
        orders: orders
      }
    }
  }

  updateOne (order) {
    if (this.watchingSockets[order.pair] && this.watchingSockets[order.pair].orders[order.id]) {
      this.watchingSockets[order.pair].orders[order.id] = order
      return true
    }
    return false
  }
  watch (trades) {
    let {
      s: symbol,
      p: price
    } = trades
    price = parseFloat(price)
    let orders = this.watchingSockets[symbol].orders
    let watchs = Object.keys(orders)
    let self = this
    if (watchs.length) {
      Object.values(orders).forEach(e => {
        if (e.status === 'waiting') {
          switch (e.mode) {
            case 'sell':
              if (e.expect_price + e.offset <= price) {
                e.status = 'watching'
                self.updateStatus(e)
                e.save()
              }
              break
            case 'buy':
              if (e.expect_price - e.offset > price) {
                e.status = 'watching'
                self.updateStatus(e)
                e.save()
              }
              break
          }
        }
        if (e.status !== 'watching') return
        switch (e.mode) {
          case 'sell':
            if (price < e.expect_price) return
            if (!e.offset) e.offset = price - e.expect_price
            if (e.price + e.offset <= price) {
              e.price = price - e.offset
              console.debug(`expect order ${e.id} ${e.mode} at ${e.price} offset ${e.offset}`)
              // save to db
              self.updateStatus(e)
              e.save()
            } else if (e.price > price) {
              // trigger sell market
              self.triggerOrder(e, price, orders)
            }
            break
          case 'buy':
            if (price > e.expect_price) return
            if (!e.offset) e.offset = e.expect_price - price
            if (e.price - e.offset >= price) {
              e.price = price + e.offset
              console.debug(`expect order ${e.id} ${e.mode} at ${e.price} offset ${e.offset}`)
              // save to db
              self.updateStatus(e)
              e.save()
            } else if (e.price < price) {
              // trigger buy market
              self.triggerOrder(e, price, orders)
            }
            break
        }
      })
    } else {
      this.binance.websockets.terminate(this.watchingSockets[symbol].id)
      delete this.watchingSockets[symbol]
    }
  }
  triggerOrder (e, price, orders) {
    let self = this
    let callback = (e, response) => {
      response.price = parseFloat(response.price)
      if (response.price > 0) {
        e.binance_order_id = response.orderId || 0
        e.price = response.price
        e.status = 'done'
        self.updateStatus(e)
        e.save()
        if (e.balance_id) {
          BinanceTestTrade.postPlaceOrder(e, response)
        }
        delete orders[e.id]
        console.info(`[${e.type}][success] trigger order ${e.id} market ${e.mode} at ${response.price} offset ${e.offset} orderid ${response.orderId}`)
      } else {
        e.status = 'watching'
        e.save()
        console.info(`[${e.type}][false] trigger order ${e.id} market ${e.mode} at ${response.priced} offset ${e.offset} res ${JSON.stringify(response)}`)
      }
    }

    e.status = 'ordering'
    e.price = price
    console.info(`[${e.type}] trigger order ${e.id} market ${e.mode} at ${price} offset ${e.offset} `)
    this.order(e).then(response => {
      callback(e, response)
    })
  }

  _mockPlaceMarket (orderData) {
    return new Promise((resolve, reject) => {
      resolve({
        executedQty: orderData.quantity,
        price: orderData.mode === 'buy' ? orderData.price * 1.001 : orderData.price * 0.999
      })
    })
  }
  order (orderData) {
    if (!process.env.REAL_API) {
      return this._mockPlaceMarket(orderData)
    }

    switch (orderData.type) {
      case 'TEST':
        return this._mockPlaceMarket(orderData)
      case 'REAL':
        if (this.activeUsers[orderData.user_id].api) {
          return this.activeUsers[orderData.user_id].api.placeMarket(orderData)
        }
        return BinanceUser.findByPrimary(orderData.user_id).then(binanceUser => {
          let privateClient = new BinancePrivateApi(binanceUser.api_key, binanceUser.api_secret)
          this.activeUsers[orderData.user_id].api = privateClient
          return privateClient.placeMarket(orderData)
        })
      default:
        return new Promise((resolve, reject) => {
          console.error('Order error, invalid type! ', orderData)
          reject(new Error('Order error, invalid type! '))
        })
    }
  }

  updateStatus (order) {
    this.emitOrders(order.user_id, [order])
  }
}

const instance = new BinanceBot()
// Object.freeze(instance)

export default instance
