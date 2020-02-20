import BinanceService from '../../Services/BinanceService'
import {User, BinanceUser} from '../../Models'
var express = require('express')
var router = express.Router()

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' })
})

router.get('/estimate/:userName', (req, res, next) => {
  let userName = req.params.userName
  console.log('Username ', userName)
  User.findOne({where: { username: userName}}).then(user => {
    if (user) {
      req.user = user
      const binanceService = new BinanceService(req)
      binanceService.getBinanceApi().then(api => {
        binanceService.estimateBalance().then(result => {
          res.send(JSON.stringify(result))
        }).catch(error => {
          console.error('NODEAPP', '[BinaneRoutes]', error)
          res.send({
            success: false,
            error: error
          })
        })
      })
    } else {
      res.send({
        success: false,
        error: 'Error'
      })
    }
  })
})
module.exports = router
