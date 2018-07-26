
import passport from 'passport'
import BinanceService from '../../Services/BinanceService'
import {BinanceUser} from '../../Models'
import BinancePrivateApi from '../../Services/Apis/BinancePrivateApi'
var express = require('express')
var router = express.Router()

let routes = [
  {
    method: 'get',
    endpoint: '/allPrices',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.allPrices().then(result => {
        res.send({
          success: true,
          data: result
        })
      }).catch(error => {
        console.error('[BinaneRoutes]', error)
        res.send({
          success: false,
          error: error
        })
      })
    }
  },
  {
    method: 'get',
    endpoint: '/accountInfo',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.accountInfo().then(result => {
        res.send({
          success: true,
          data: result
        })
      }).catch(error => {
        console.error('[BinaneRoutes]', error)
        res.send({
          success: false,
          error: error
        })
      })
    }
  },
  {
    method: 'post',
    endpoint: '/apiSetting',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.apiSetting({
        api_key: req.body.apiKey,
        api_secret: req.body.apiSecret
      }).then(result => {
        res.send({
          success: true,
          data: result
        })
      }).catch(error => {
        console.error('[BinaneRoutes]', error)
        res.send({
          success: false,
          error: {
            msg: error
          }
        })
      })
    }
  },
  // {
  //   method: 'post',
  //   endpoint: '/placeOrder',
  //   func: (req, res) => {
  //     const binanceService = new BinanceService(req)
  //     binanceService.placeOrder({
  //       user_id: req.user.id,
  //       pair: req.body.pair,
  //       price: parseFloat(req.body.price),
  //       quantity: parseFloat(req.body.quantity),
  //       mode: req.body.mode,
  //       type: req.body.type,
  //       offset: parseFloat(req.body.offset),
  //       expect_price: parseFloat(req.body.expect_price || 0)
  //     }).then(result => {
  //       res.send({
  //         success: true,
  //         data: result
  //       })
  //     }).catch(error => {
  //       console.error('[BinaneRoutes]', error)
  //       res.send({
  //         success: false,
  //         error: error
  //       })
  //     })
  //   }
  // },
  // {
  //   method: 'post',
  //   endpoint: '/updateOrder',
  //   func: (req, res) => {
  //     const binanceService = new BinanceService(req)
  //     binanceService.updateOrderStatus({
  //       id: req.body.orderId,
  //       status: req.body.status

  //     }).then(result => {
  //       res.send({
  //         success: true,
  //         data: result
  //       })
  //     }).catch(error => {
  //       console.error('[BinaneRoutes]', error)
  //       res.send({
  //         success: false,
  //         error: error
  //       })
  //     })
  //   }
  // },
  {
    method: 'post',
    endpoint: '/commandBot',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.commandBot({
        command: req.body.command
      }).then(result => {
        res.send({
          success: true,
          data: result
        })
      }).catch(error => {
        console.error('[BinaneRoutes]', error)
        res.send({
          success: false,
          error: error
        })
      })
    }
  }
]

let getBinanceApi = (req, res, next) => {
  if (!req || !req.user) {
    console.log('no user in req')
    res.sendStatus(401)
    return
  }
  const user = req.user.get()
  BinanceUser.findByPrimary(user.id).then(data => {
    if (data) {
      const binanceUser = data.get()
      const binancePrivateApi = new BinancePrivateApi(binanceUser.api_key, binanceUser.api_secret)
      req.binancePrivateApi = binancePrivateApi
      next()
    } else {
      console.log('no user in BinanceUser')
      res.send({
        success: false,
        error: 'no user in BinanceUser'
      })
    }
  }).catch(error => {
    console.error('[BinaneRoutes]', 'getBinanceApi', error)
    res.send({
      success: false,
      error: error.message
    })
  })
}

routes.forEach(e => {
  switch (e.method) {
    case 'get':
      router.get(e.endpoint, [passport.authenticate('jwt'), getBinanceApi], e.func)
      break
    case 'post':
      router.post(e.endpoint, [passport.authenticate('jwt'), getBinanceApi], passport.authenticate('jwt'), e.func)
  }
})

module.exports = router
