import TestBalanceService from '../../Services/TestBalanceService'
import BinanceTestTrade from '../../Bot/BinanceTestTrade'
import passport from 'passport'
var express = require('express')
var router = express.Router()

router.use(passport.authenticate('jwt'))
router.route('/')
  .get((req, res, next) => {
    let service = new TestBalanceService(req)
    service.get()
    .then(result => res.send(result))
    .catch(error => res.send({
      success: false,
      message: error
    }))
  })
  .post((req, res, next) => {
    let service = new TestBalanceService(req)
    let params = {
      user_id: req.user.id,
      pair: req.body.pair,
      currency: req.body.currency,
      asset: req.body.asset,
      offset: parseFloat(req.body.offset),
      type: req.body.type || 'TEST'
    }
    service.create(params).then(result => {
      res.send(result)
    })
    .catch(error => res.send({
      success: false,
      message: error
    }))
  })
  .delete((req, res, next) => {
    let service = new TestBalanceService(req)
    let params = {id: req.body.id}
    service.delete(params).then(result => {
      res.send(result)
    })
    .catch(error => res.send({
      success: false,
      message: error
    }))
  })
module.exports = router
