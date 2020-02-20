
import passport from 'passport'
import bcrypt from 'bcrypt'
const saltRounds = 12
const {User, BinanceUser} = require('../../Models/index')
var settings = require('../../config/config')
var jwt = require('jsonwebtoken')
var express = require('express')

var router = express.Router()
var createToken = function (auth) {
  var token = jwt.sign(JSON.stringify({
    id: auth.id,
    logged_at: auth.logged_at
  }), settings.secret)
  return token
}

var generateToken = function (req, res, next) {
  req.token = createToken(req.auth)
  return next()
}
var sendToken = function (req, res) {
  return res.json({
    success: true,
    token: req.token,
    name: req.user ? req.user.name : ''
  })
}

router.post('/register',
    async function (req, res, next) {
      if (req.body.token !== 'XcnLIg71Yo') {
        return res.send(401, 'User Not Authenticated')
      }
      let user = await User.findOne({
        where: {
          username: req.query.username
        }
      })
      if (user) {
        return res.send(401, 'User Existed')
      }
      const password = await bcrypt.hash(req.body.password, saltRounds)
      user = await User.create({
        username: req.body.username,
        password: password,
        name: req.body.username,
        email: ''
      })
      req.auth = {
        id: user.id
      }
      await BinanceUser.create({
        user_id: user.id,
        api_key: '',
        api_secret: ''
      })
      next()
    }, generateToken, sendToken
)

router.post('/login',
  passport.authenticate('local'),
  function (req, res, next) {
    if (!req.user) {
      return res.send(401, 'User Not Authenticated')
    }
    req.auth = {
      id: req.user.id,
      logged_at: req.user.logged_at
    }
    next()
  }, generateToken, sendToken
)

router.post('/auth/google',
  passport.authenticate('google-token', {session: false}),
  function (req, res, next) {
    if (!req.user) {
      return res.send(401, 'User Not Authenticated')
    }
    req.auth = {
      id: req.user.id,
      logged_at: req.user.logged_at
    }

    next()
  }, generateToken, sendToken
)

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/')
  }
)

router.get('/logout', [passport.authenticate('jwt')], (req, res) => {
  User.findOne({
    where: {
      id: req.user.id
    }
  }).then(user => {
    user.logged_at = new Date().getTime()
    user.save()
    req.logout()
    res.send({
      success: true,
      data: 'Logged out'
    })
  })
})

module.exports = router
