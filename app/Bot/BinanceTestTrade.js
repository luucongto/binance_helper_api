import Binance from 'node-binance-api'
import BinanceBot from './BinanceBot'
import {Op} from 'sequelize'
import {TestBalance, UserOrder} from '../Models'
class BinanceTestTrade {
  constructor () {
    // Authenticated client, can make signed calls
    this.binance = new Binance()
    this.emptyTimeout = 60000
    this.watchingSockets = {}
    this.activeUsers = {}
    this.watching = {
      // 'ADAUSDT' : {
      //   id: {
    //     orderId: orderId
    //     updating: false
    // }
      // }
    }
  }
  setUser (data) {
    let self = this
    if (this.activeUsers[data.id]) {
      this.activeUsers[data.id].socket = data.socket
    } else {
      this.activeUsers[data.id] = {
        socket: data.socket
      }
    }

    data.socket.on('auto_order', params => {
      switch (params.command) {
        case 'placeOrder':
          TestBalance.create({
            user_id: data.id,
            pair: params.asset + params.currency,
            currency: params.currency,
            asset: params.asset,
            currency_num: parseFloat(params.currency_num || 0),
            asset_num: parseFloat(params.asset_num || 0),
            offset: parseFloat(params.offset || 0),
            status: 'watching',
            strategy: params.strategy
          }).then(balance => {
            self.addToWatchList(balance)
            data.socket.emit('auto_order', [balance])
          })
          break
        case 'cancelOrder':
          TestBalance.findById(params.id).then(balance => {
            if (balance) {
              balance.status = 'cancel'
              balance.save().then(balance => {
                data.socket.emit('auto_order', [balance])
              })
              self.cancelBalance(balance)
            }
          })
          break
        case 'refresh':
          TestBalance.findAll({
            where: {
              user_id: data.id
            }
          }).then(balances => {
            data.socket.emit('auto_order', balances)
          })
          break
      }
      console.info('auto_order', params)
    })
  }

  start () {
    let self = this
    try {
      console.log('[trailing] Testing....')
      TestBalance.findAll({
        where: {
          strategy: 'trailing',
          status: 'watching'
        }
      }).then(balances => {
        if (balances.length) {
          balances.forEach(balance => {
            self.addToWatchList(balance)
          })
        }
      }).catch(e => {
        self.emptyTimeout += 10000
        console.info(`[trailing] Met Error ${JSON.stringify(e)}, restarting...`)
      })
    } catch (e) {
      console.info(`[trailing] Met Error ${JSON.stringify(e)}, restarting...`)
    }
  }
  addToWatchList (balance) {
    if (!this.watching[balance.pair]) { this.watching[balance.pair] = {} }
    this.watching[balance.pair][balance.id] = balance
    if (this.activeUsers[balance.user_id] && this.activeUsers[balance.user_id].socket) {
      this.activeUsers[balance.user_id].socket.emit('auto_order', [balance])
    }
    let self = this
    if (!this.watchingSockets[balance.pair]) {
      this.watchingSockets[balance.pair] = self.binance.websockets.trades([balance.pair], (trades) => {
        self.updatePrice(trades.s, trades.p)
      })
    }
  }
  cancelBalance (balance) {
    UserOrder.findAll({
      where: {
        balance_id: balance.id,
        status: {
          [Op.in]: ['watching', 'waiting']
        }
      }
    }).then(orders => {
      orders.forEach(order => {
        order.status = 'cancel'
        BinanceBot.updateStatus(order)
        order.save()
      })
    })
  }
  updatePrice (pair, price) {
    let self = this
    price = parseFloat(price)
    let balances = Object.values(this.watching[pair])
    if (balances.length > 0) {
      balances.forEach(balance => {
        self.setupOne(balance, price)
        delete this.watching[pair][balance.id]
      })
    }
  }
  setupOne (balance, price) {
    let self = this
    UserOrder.findOne({where: {balance_id: balance.id,
      status: {
        [Op.in]: ['watching', 'waiting']
      }}}).then(orderObj => {
        if (orderObj) {
        // existed order
          console.info('trailing', `Start testing: ${balance.id}  ${balance.currency_num}:${balance.asset_num} ${balance.pair} offset ${balance.offset} ${balance.is_percent ? '%' : '$'} orderId ${orderObj.id}`)
        } else {
          self._placeNewOrder(balance, price)
        }
      })
  }

  postPlaceOrder (order, marketResponse) {
    let self = this
    TestBalance.findById(order.balance_id).then(balance => {
      if (order.mode === 'sell') {
        balance.asset_num -= marketResponse.executedQty
        balance.currency_num += marketResponse.executedQty * marketResponse.price
      } else if (order.mode === 'buy') {
        balance.asset_num += marketResponse.executedQty
        balance.currency_num -= marketResponse.executedQty * marketResponse.price
      }
      balance.save().then(balanceObj => {
        self.activeUsers[balanceObj.user_id].socket.emit('auto_order', [balanceObj])
      })
      self._placeNewOrder(balance, marketResponse.price)
      return {
        price: order.price
      }
    }).catch(error => {
      console.error('trailing placeMarket', error)
      return {
        price: 0
      }
    })
  }

  _placeNewOrder (balance, marketPrice) {
    let self = this
    let newOrder = {
      user_id: balance.user_id,
      type: balance.strategy,
      mode: null,
      price: 0,
      status: 'waiting',
      currency: balance.currency,
      asset: balance.asset,
      pair: balance.pair,
      quantity: null,
      balance_id: balance.id,
      expect_price: marketPrice,
      offset: balance.offset
    }
    if (balance.currency_num > balance.asset_num * marketPrice) {
      newOrder.mode = 'buy'
      newOrder.expect_price *= 0.999
      newOrder.quantity = balance.currency_num / marketPrice
    } else {
      newOrder.mode = 'sell'
      newOrder.expect_price *= 1.001
      newOrder.quantity = balance.asset_num
    }
    UserOrder.create(newOrder).then(orderObj => {
      BinanceBot.updateStatus(orderObj)
      BinanceBot.setupOne(orderObj)
    })
  }
}

const instance = new BinanceTestTrade()
// Object.freeze(instance)

export default instance