import {TestBalance} from '../Models'
import autoBind from 'auto-bind'
import BinanceTestTrade from '../Bot/BinanceTestTrade'
import DailyStrategyTest from '../Bot/DailyStrategyTest'
class TestBalanceService {
  constructor (req) {
    this.req = req
    this.userId = req.user.id
    autoBind(this)
  }
  get () {
    return TestBalance.findAll().then(result => {
      return {
        success: true,
        data: result
      }
    })
  }
  create (params) {
    return TestBalance.create(params).then(result => {
      switch (result.strategy) {
        case '24h':
          DailyStrategyTest.addToWatchList(result)
          break
        case 'trailing':
          BinanceTestTrade.addToWatchList(result)
          break
        default:
          console.log('ERROR NULL Strategy')
      }
      return {
        success: true,
        data: result
      }
    })
  }
  delete (params) {
    return TestBalance.findById(params.id).then(result => {
      return result.destroy()
    }).then(result => {
      return {
        success: true,
        data: result
      }
    })
  }
}

module.exports = TestBalanceService
