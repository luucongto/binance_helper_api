
import passport from 'passport'
import BinanceService from '../../Services/BinanceService'
import {BinanceUser} from '../../Models'
import BinancePrivateApi from '../../Services/Apis/BinancePrivateApi'
var express = require('express')
var router = express.Router()

let routes = [
  {
    method: 'get',
    endpoint: '/allOrders',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.allOrders().then(result => {
        res.send(result)
      }).catch(error => {
        console.error(error)
        res.sendStatus(501)
      })
    }
  },
  {
    method: 'get',
    endpoint: '/accountInfo',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.accountInfo().then(result => {
        res.send(result)
      }).catch(error => {
        console.error(error)
        res.sendStatus(501)
      })
    }
  },
  {
    method: 'post',
    endpoint: '/placeOrder',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.placeOrder({
        user_id: req.user.id,
        pair: req.body.pair,
        price: parseFloat(req.body.price),
        quantity: parseFloat(req.body.quantity),
        mode: req.body.mode,
        type: req.body.type,
        expect_price: parseFloat(req.body.expect_price || 0)
      }).then(result => {
        res.send(result)
      }).catch(error => {
        console.error(error)
        res.sendStatus(501)
      })
    }
  },
  {
    method: 'post',
    endpoint: '/updateOrder',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.updateOrderStatus({
        id: req.body.orderId,
        status: req.body.status

      }).then(result => {
        res.send(result)
      }).catch(error => {
        console.error(error)
        res.sendStatus(501)
      })
    }
  },
  {
    method: 'post',
    endpoint: '/commandBot',
    func: (req, res) => {
      const binanceService = new BinanceService(req)
      binanceService.commandBot({
        command: req.body.command
      }).then(result => {
        res.send(result)
      }).catch(error => {
        console.error(error)
        res.sendStatus(501)
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
      res.sendStatus(401)
    }
  }).catch(error => {
    console.error('getBinanceApi', error)
    res.sendStatus(401)
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
