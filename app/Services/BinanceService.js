import {BinanceUser, UserOrder} from '../Models'
import BinancePrivateApi from './Apis/BinancePrivateApi'
import BinanceBot from '../Bot/BinanceBot'
import autoBind from 'auto-bind'

class BinanceService {
  constructor (req) {
    this.req = req
    this.binancePrivateApi = req.binancePrivateApi
    this.userId = req.user.id
    autoBind(this)
  }
  getBinanceApi () {
    const user = this.req.user.get()
    let self = this
    return BinanceUser.findByPrimary(user.id).then(data => {
      if (data) {
        const binanceUser = data.get()
        const binancePrivateApi = new BinancePrivateApi(binanceUser.api_key, binanceUser.api_secret)
        self.binancePrivateApi = binancePrivateApi
        return binancePrivateApi
      } else {
        throw (new Error('binance user not found'))
      }
    }).catch(error => {
      console.error('NODEAPP', 'getBinanceApi', error)
      throw (new Error('binance user error'))
    })
  }
  estimateBalance () {
    if (!this.binancePrivateApi) {
      return {}
    }
    return this.binancePrivateApi.estimateBalance()
  }
  allPrices () {
    if (!this.binancePrivateApi) {
      return {}
    }
    return this.binancePrivateApi.allPrices()
  }
  async accountInfo () {
    if (!this.binancePrivateApi) {
      return {}
    }
    let result = await this.binancePrivateApi.accountInfo()
    return result
  }
  apiSetting (params) {
    if (params.api_key !== '' || params.api_secret !== '') {
      return BinanceUser.findByPrimary(this.userId).then(binanceUser => {
        if (binanceUser) {
          if (params.api_key) binanceUser.api_key = params.api_key
          if (params.api_secret) binanceUser.api_secret = params.api_secret
          return binanceUser.save()
        } else {
          throw (new Error('binance user not found'))
        }
      }).then(binanceUser => {
        return {
          success: true
        }
      })
    } else {
      return new Promise((resolve, reject) => {
        resolve({
          success: false,
          error: 'Empty api key and api secret'
        })
      })
    }
  }
  updateOrderStatus (params) {
    return UserOrder.findOne({
      where: {
        id: params.id
      }
    }).then(result => {
      result.status = params.status
      result.save()
      if (params.status === 'watching') {
        BinanceBot.setupOne(result, this.binancePrivateApi, false)
      } else {
        BinanceBot.removeOne(result)
      }
      return [result]
    }).catch(error => {
      console.error('NODEAPP', error)
      throw (new Error('updateOrderStatus'))
    })

    // return this.binancePrivateApi.updateOrderStatus(params)
    // .then(result => {
    //   return result
    // }).catch(error => {
    //   console.error('NODEAPP',error)
    //   throw (new Error('placeOrder'))
    // })
  }
  commandBot (params) {
    return UserOrder.findAll({where: {user_id: this.userId, status: 'watching'}}).then(result => {
      BinanceBot.addTrailingStopOrder(result, this.binancePrivateApi, true)
      return result
    }).catch(error => {
      console.error('NODEAPP', error)
      throw (new Error('placeOrder'))
    })
  }

  async tradeHistory (params) {
    let result = await this.binancePrivateApi.tradeHistory(params.symbol, params.fromId)
    return result
  }
}

module.exports = BinanceService
