import Binance from 'node-binance-api'
import BinanceBot from './BinanceBot'
import {Op} from 'sequelize'
import {TestBalance, UserOrder} from '../Models'
class BinanceTestTrade {
  constructor () {
    // Authenticated client, can make signed calls
    this.binance = new Binance()
    this.emptyTimeout = 0
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
            currency_num: parseFloat(params.currency_num),
            asset_num: parseFloat(params.asset_num),
            offset: parseFloat(params.offset),
            status: 'watching',
            strategy: params.strategy.toLowerCase()
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
      console.log('auto_order', params)
    })
  }

  start () {
    let self = this
    try {
      console.log('trailing', 'Testing....')
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
        } else {
          self.emptyTimeout += 10000
          setTimeout(() => {
            self.start()
          }, self.emptyTimeout)
        }
      }).catch(e => {
        console.log('trailing', 'Met Error, restarting...', e)
        setTimeout(() => {
          self.start()
        }, 5000)
      })
    } catch (e) {
      console.log('trailing', 'Met Error, restarting...', e)
      setTimeout(() => {
        self.start()
      }, 5000)
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
          console.log('trailing', `Start testing: ${balance.id}  ${balance.currency_num}:${balance.asset_num} ${balance.pair} offset ${balance.offset} ${balance.is_percent ? '%' : '$'} orderId ${orderObj.id}`)
        } else {
          let quantity = balance.currency_num > balance.asset_num ? (balance.currency_num / price) : balance.asset_num
          let order = {
            user_id: balance.user_id,
            type: 'TEST',
            mode: balance.currency_num > balance.asset_num ? 'buy' : 'sell',
            price: 0,
            status: 'waiting',
            currency: balance.currency,
            asset: balance.asset,
            pair: balance.pair,
            balance_id: balance.id,
            expect_price: price,
            quantity: quantity,
            offset: balance.offset
          }
          UserOrder.create(order).then(orderObj => {
            BinanceBot.updateStatus(orderObj)
            console.log('trailing', `Start testing: ${balance.id}  ${balance.currency_num}:${balance.asset_num} ${balance.pair} offset ${balance.offset} ${balance.is_percent ? '%' : '$'} orderId ${orderObj.id}`)
          })
        }
      })
  }

  placeMarket (order) {
    let self = this
    return TestBalance.findById(order.balance_id).then(balance => {
      if (order.mode === 'sell') {
        balance.asset_num -= order.quantity
        balance.currency_num += order.quantity * order.price
      } else if (order.mode === 'buy') {
        balance.asset_num += order.quantity
        balance.currency_num -= order.quantity * order.price
      }
      balance.save()
      let newOrder = {
        user_id: balance.user_id,
        type: 'TEST',
        mode: order.mode === 'sell' ? 'buy' : 'sell',
        price: 0,
        status: 'waiting',
        currency: balance.currency,
        asset: balance.asset,
        pair: balance.pair,
        quantity: order.quantity,
        balance_id: balance.id,
        expect_price: order.price,
        offset: balance.offset
      }
      UserOrder.create(newOrder).then(orderObj => {
        console.log('trailing', `Start testing: ${balance.id}  ${balance.currency_num}:${balance.asset} ${balance.pair} offset ${balance.offset} ${balance.is_percent ? '%' : '$'} WATCHINGID ${this.watching[balance.id]}`)
        BinanceBot.setupOne(orderObj, self)
      })
      return {
        price: order.price
      }
    }).catch(error => {
      console.log('trailing', error)
      return {
        price: 0
      }
    })
  }
}

const instance = new BinanceTestTrade()
// Object.freeze(instance)

export default instance
