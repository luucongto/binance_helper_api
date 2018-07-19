import {BinanceUser, UserOrder} from '../Models'
import BinancePrivateApi from './Apis/BinancePrivateApi'
import BinanceBot from '../Bot/BinanceBot'
class BinanceService {
  constructor (req) {
    this.req = req
    this.binancePrivateApi = req.binancePrivateApi
    this.userId = req.user.id
    this.getBinanceApi = this.getBinanceApi.bind(this)
    this.allOrders = this.allOrders.bind(this)
    this.commandBot = this.commandBot.bind(this)
  }
  getBinanceApi () {
    const user = this.req.user.get()
    return BinanceUser.findByPrimary(user.id).then(data => {
      if (data) {
        const binanceUser = data.get()
        const binancePrivateApi = new BinancePrivateApi(binanceUser.api_key, binanceUser.api_secret)
        return binancePrivateApi
      } else {
        throw (new Error('binance user not found'))
      }
    }).catch(error => {
      console.error('getBinanceApi', error)
      throw (new Error('binance user error'))
    })
  }
  allOrders () {
    return UserOrder.findAll({
      where: {
        user_id: this.userId
      }
    }).then(result => {
      return result
    }).catch(error => {
      console.error(error)
      throw (new Error('AllOrders'))
    })
    // return this.binancePrivateApi.allOrders()
    // .then(result => {
    //   return result
    // }).catch(error => {
    //   console.error(error)
    //   throw (new Error('AllOrders'))
    // })
  }
  accountInfo () {
    return this.binancePrivateApi.accountInfo()
    .then(result => {
      return result
    }).catch(error => {
      console.error(error)
      throw (new Error('accountInfo'))
    })
  }
  placeOrder (params) {
    if (params.type === 'TRAILING_STOP') {
      return UserOrder.create({
        user_id: params.user_id,
        pair: params.pair,
        price: params.expect_price || 0,
        quantity: params.quantity,
        mode: params.mode,
        type: params.type,
        status: 'watching',
        expect_price: params.expect_price || 0
      }).then(result => {
        BinanceBot.addTrailingStopOrder([result], false)
        return result.get()
      })
    }

    // return this.binancePrivateApi.placeLimit(params)
    // .then(result => {
    //   return result
    // }).catch(error => {
    //   console.error(error)
    //   throw (new Error('placeOrder'))
    // })
  }
  updateOrderStatus (params) {
    return UserOrder.findOne({
      where: {
        id: params.id
      }
    }).then(result => {
      result.status = params.status === 'watching' ? params.status : 'hold'
      result.save()
      if (params.status === 'watching') { BinanceBot.addTrailingStopOrder([result], false) }
      return [result]
    }).catch(error => {
      console.error(error)
      throw (new Error('updateOrderStatus'))
    })

    // return this.binancePrivateApi.updateOrderStatus(params)
    // .then(result => {
    //   return result
    // }).catch(error => {
    //   console.error(error)
    //   throw (new Error('placeOrder'))
    // })
  }
  commandBot (params) {
    return UserOrder.findAll({where: {user_id: this.userId, status: 'watching'}}).then(result => {
      BinanceBot.addTrailingStopOrder(result, true)
      return result
    }).catch(error => {
      console.error(error)
      throw (new Error('placeOrder'))
    })
  }
}

module.exports = BinanceService
