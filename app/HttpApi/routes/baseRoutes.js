import bcrypt from 'bcrypt'
var User = require('../../Models').User
var settings = require('../../config/config')
var jwt = require('jsonwebtoken')
var express = require('express')

var router = express.Router()
let routes = [{
  method: 'get',
  endpoint: '/',
  func: function (req, res) {
    res.send('Hello,it is working')
  }
},
{
  method: 'get',
  endpoint: '/login',
  func: function (req, res) {
    res.send('Login Page')
  }
},
{
  method: 'post',
  endpoint: '/login',
  func: function (req, res) {
    User.findOne({
      where: {
        username: req.body.username
      }
    }).then(user => {
      user = user.get()
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
            var token = jwt.sign(JSON.stringify(user), settings.secret)
            // return the information including token as JSON
            res.json({
              success: true,
              token: token
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
