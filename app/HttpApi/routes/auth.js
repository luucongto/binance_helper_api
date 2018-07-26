import bcrypt from 'bcrypt'
import passport from 'passport'
var User = require('../../Models').User
var settings = require('../../config/config')
var jwt = require('jsonwebtoken')
var express = require('express')

var router = express.Router()

let routes = [{
  method: 'post',
  endpoint: '/login',
  func: function (req, res) {
    User.findOne({
      where: {
        username: req.body.username
      }
    }).then(user => {
      if (!user) {
        res.status(401).send({
          success: false,
          msg: 'Authentication failed. User not found.'
        })
      } else {
        // check if password matches
        bcrypt.compare(req.body.password, user.password, function (err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            let now = parseInt(new Date().getTime() / 1000)
            user.logged_at = now
            user.save()
            var token = jwt.sign(JSON.stringify({
              id: user.id,
              logged_at: now
            }), settings.secret)
            // return the information including token as JSON
            res.json({
              success: true,
              token: token,
              name: user.name
            })
          } else {
            res.status(401).send({
              success: false,
              msg: 'Authentication failed. Wrong password.'
            })
          }
        })
      }
    }).catch(err => {
      console.log(err)
      res.status(401).send({
        success: false,
        msg: 'Authentication failed. Wrong password.'
      })
    })
  }
}
]

router.get('/logout', [passport.authenticate('jwt')], (req, res) => {
  User.findOne({
    where: {
      id: req.user.id
    }
  }).then(user => {
    user.logged_at = new Date().getTime()
    user.save()
    res.send({
      success: true,
      data: 'Logged out'
    })
  })
})

routes.forEach(e => {
  switch (e.method) {
    case 'get':
      router.get(e.endpoint, e.func)
      break
    case 'post':
      router.post(e.endpoint, e.func)
  }
})

module.exports = router
