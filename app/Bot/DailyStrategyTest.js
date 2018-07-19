import Binance from 'node-binance-api'

import {TestBalance, TestHistory} from '../Models'

const DAY = 24 * 60 * 60 * 1000
class DailyStrategyTest {
  constructor () {
    // Authenticated client, can make signed calls
    this.binance = new Binance()
    this.emptyTimeout = 0
    this.watching = {}
  }

  start () {
    let self = this
    try {
      console.log('24h', 'Testing....')
      TestBalance.findAll({
        where: {
          strategy: '24h'
        }
      }).then(balances => {
        if (balances.length) {
          balances.forEach(balance => {
            self.setupOne(balance)
          })
        } else {
          self.emptyTimeout += 10000
          setTimeout(() => {
            self.start()
          }, self.emptyTimeout)
        }
      }).catch(e => {
        console.log('24h', 'Met Error, restarting...')
        setTimeout(() => {
          self.start()
        }, 5000)
      })
    } catch (e) {
      console.log('24h', 'Met Error, restarting...')
      setTimeout(() => {
        self.start()
      }, 5000)
    }
  }
  setupOne (balance) {
    if (this.watching[balance.id]) return
    this.watching[balance.id] = true
    let self = this
    let order = {
      id: balance.id,
      mode: balance.currency > balance.asset ? 'buy_dry' : 'sell_dry',
      price: 0,
      expect_price: 0,
      offset: balance.offset,
      is_busy: false,
      created_at: new Date().getTime()
    }
    TestHistory.findOne({
      where: {
        balance_id: balance.id
      },
      order: [
        ['createdAt', 'DESC']
      ]
    }).then(result => {
      if (result) {
        order.created_at = new Date(result.createdAt).getTime()
      }
      this.watching[balance.id] = this.binance.websockets.trades([balance.pair], (trades) => {
        self.testStrategy(trades, balance, order)
      })
      console.log('24h', `Start testing: ${balance.id}  ${balance.currency}:${balance.asset} ${balance.pair} offset ${balance.offset} ${balance.is_percent ? '%' : '$'} WATCHINGID ${this.watching[balance.id]}`)
    }).catch(error => {
      console.error(error)
    })
  }
  testStrategy (trades, balance, e) {
    if (e.is_busy) return
    e.is_busy = true
    let now = new Date().getTime()
    let {
      p: price
    } = trades
    price = parseFloat(price)
    let sell = (price) => {
      e.price = price
      e.mode = 'buy_dry'
      e.created_at = new Date().getTime()
      TestHistory.create({
        balance_id: balance.id,
        mode: 'sell_dry',
        price: price,
        quantity: balance.asset
      })
      balance.currency += (balance.asset * price)
      balance.asset -= balance.asset
      balance.save()
    }
    let buy = (price) => {
      e.price = price
      e.mode = 'sell_dry'
      e.created_at = new Date().getTime()

      TestHistory.create({
        balance_id: balance.id,
        mode: 'buy_dry',
        price: price,
        quantity: balance.currency / price
      })
      balance.asset += balance.currency / price
      balance.currency -= balance.currency
      balance.save()
    }
    let offset = price * e.offset
    if (e.price === 0) e.price = price
    this.binance.prevDay(balance.pair, (error, prevDay, symbol) => {
      let lastPrice = prevDay.lastPrice
      switch (e.mode) {
        case 'sell_dry':
          if (now - e.created_at >= DAY) {
            console.log('24h', `trigger day order${balance.id} ${balance.pair} market ${e.mode} at ${price}/${e.price} offset ${offset} balances: ${balance.currency}:${balance.asset}`)
            sell(price)
          } else if (now - e.created_at < DAY && price - e.price >= offset) {
            console.log('24h', `trigger price order${balance.id} ${balance.pair} market ${e.mode} at ${price}/${e.price} offset ${offset} balances: ${balance.currency}:${balance.asset}`)
            sell(price)
          }
          break
        case 'buy_dry':
          if (price > lastPrice) {
            // trigger buy market
            console.log('24h', `trigger order ${balance.id} ${balance.pair} market ${e.mode} at ${price}/${lastPrice} offset ${offset} balances: ${balance.currency}:${balance.asset}`)
            buy(price)
          }
          break
      }
      e.is_busy = false
    })
  }
}

const instance = new DailyStrategyTest()
// Object.freeze(instance)

export default instance
