import Binance from 'node-binance-api'
import BinancePrivateApi from '../Services/Apis/BinancePrivateApi'
import BinanceTestTrade from './BinanceTestTrade'
import {BinanceUser, UserOrder} from '../Models'
import {Op} from 'sequelize'
import ApiInfo from './api_info'
import MailSender from './MailSender'
import moment from 'moment'
import Utils from './Utils'
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
      return
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

          console.log('placeOrder', params)
          let orderParams = {
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
          }
          orderParams.quantity = Utils.calculateQty(orderParams)
          self.placeOrder(orderParams)
          break
        case 'updateOrder':
          console.log(params)
          UserOrder.findById(params.id).then(order => {
            if (order) {
              if (params.status !== undefined) order.status = params.status
              if (params.expect_price !== undefined) order.expect_price = params.expect_price
              if (params.offset !== undefined) order.offset = params.offset
              if (params.quantity !== undefined) order.quantity = params.quantity
              if (params.type !== undefined) order.type = params.type
              order.quantity = Utils.calculateQty(order)
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
    console.log('NODEAPP', moment().format('MM/DD HH:mm:ss'), 'Initializing.... REAL: ' + process.env.REAL_API)
    let self = this
    console.log('NODEAPP', moment().format('MM/DD HH:mm:ss'), 'Setup watching list....')
    UserOrder.findAll({where: {
      status: {
        [Op.in]: ['waiting', 'watching']
      }}}).then(orders => {
        console.log('NODEAPP', moment().format('MM/DD HH:mm:ss'), 'Find orders....', orders.length)
        if (orders.length) {
          let funcs = orders.map(order => new Promise((resolve, reject) => resolve(self.setupOne(order))))
          return Promise.all(funcs).then(() => {
            console.log('NODEAPP', moment().format('MM/DD HH:mm:ss'), `WATCHING ${funcs.length} orders`)
          })
        }
        return []
      }).catch(error => {
        console.error('NODEAPP', error)
        throw (new Error('placeOrder'))
      })
  }

  setupOne (order, api) {
    if (this.watchingSockets[order.pair] && this.watchingSockets[order.pair].orders[order.id]) {
      console.log('NODEAPP', moment().format('MM/DD HH:mm:ss'), `order ${order.id} duplicated`)
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
      let funcs = Object.values(orders).map(e => {
        return new Promise((resolve, reject) => {
          resolve(self._watchOrder(e, price, orders))
        })
      })
      Promise.all(funcs).then(res => {

      })
    } else {
      this.binance.websockets.terminate(this.watchingSockets[symbol].id)
      delete this.watchingSockets[symbol]
    }
  }
  _watchOrder (e, price, orders) {
    let self = this
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
          if (e.expect_price - e.offset >= price) {
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
        // if (price < e.expect_price) return
        if (!e.offset) e.offset = price - e.expect_price
        if (e.price + e.offset <= price) {
          e.price = price - e.offset
          console.debug('NODEAPP', `expect order ${e.id} ${e.mode} at ${e.price}/${price} offset ${e.offset}`)
          // save to db
          self.updateStatus(e)
          e.save()
        } else if (e.price >= price) {
          // trigger sell market
          self.triggerOrder(e, price, orders)
        }
        break
      case 'buy':
        // if (price > e.expect_price) return
        if (!e.offset) e.offset = e.expect_price - price
        if (e.price - e.offset >= price) {
          e.price = price + e.offset
          console.debug('NODEAPP', `expect order ${e.id} ${e.mode} at ${e.price}/${price} offset ${e.offset}`)
          // save to db
          self.updateStatus(e)
          e.save()
        } else if (e.price <= price) {
          // trigger buy market
          self.triggerOrder(e, price, orders)
        }
        break
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
        // MailSender.send('useremail', e)
        delete orders[e.id]
        console.info('NODEAPP', `[${e.type}][success] trigger order ${e.id} market ${e.mode} at ${response.price} offset ${e.offset} orderid ${response.orderId}`)
      } else {
        e.status = 'error'
        e.save()
        console.info('NODEAPP', `[${e.type}][false] trigger order ${e.id} market ${e.mode} at ${response.priced} offset ${e.offset} res ${JSON.stringify(response)}`)
      }
    }

    e.status = 'ordering'
    e.price = price
    console.info('NODEAPP', `[${e.type}] trigger order ${e.id} market ${e.mode} at ${price} offset ${e.offset} `)
    this.order(e).then(response => {
      callback(e, response)
    }).catch(error => {
      console.error('NODEAPP', 'Place Order error', error, `${e.id}\t ${e.user_id}\t ${e.balance_id}\t ${e.binance_order_id}\t ${e.type}\t ${e.price}\t ${e.expect_price}\t ${e.offset}\t ${e.quantity}\t ${e.mode}\t ${e.pair}\t ${e.status}\t ${e.asset}\t ${e.currency}\t`)
      e.status = error
      e.save()
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
          console.error('NODEAPP', 'Order error, invalid type! ', orderData)
          reject(new Error('Order error, invalid type! '))
        })
    }
  }

  updateStatus (order) {
    this.emitOrders(order.user_id, [order])
  }

  placeOrder (orderParams) {
    let self = this
    let filter = ApiInfo[orderParams.pair]
    if (orderParams.quantity < filter.minQty || orderParams.quantity > filter.maxQty) {
      return
    }

    UserOrder.create(orderParams).then(orderObj => {
      self.updateStatus(orderObj)
      self.setupOne(orderObj)
      // MailSender.send('useremail', orderObj)
    })
  }
}

const instance = new BinanceBot()
// Object.freeze(instance)

export default instance
