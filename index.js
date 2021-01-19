'use strict'
import passport from './app/HttpApi/passport'
import socketJwtAuth from './app/SocketApi/jwtAuth'

import {auth, baseRoutes, binanceRoutes, testBalance} from './app/HttpApi/routes'
import {sequelize} from './app/Models'
import BinanceBot from './app/Bot/BinanceBot'
import BinanceTestTrade from './app/Bot/BinanceTestTrade'
import moment from 'moment'
require('dotenv').config()
const express = require('express')
const PORT = process.env.PORT || 3000
// init db
sequelize.sync().then(() => {
  BinanceBot.start()
  BinanceTestTrade.start()
})
// Http Server
var app = express()
var session = require('express-session')
var bodyParser = require('body-parser')
var createError = require('http-errors')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true
}))

app.use(passport.initialize())
app.use(passport.session())
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
}
app.use(allowCrossDomain)

app.use('/', baseRoutes)
app.use('/', auth)
app.use('/binance', binanceRoutes)
app.use('/testBalance', testBalance)
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

// IO server
var server = require('http').createServer(app)
const socketIO = require('socket.io')
// const server = express()
//   // .use((req, res) => res.sendFile(INDEX))
//   .listen(PORT, () => console.log('NODEAPP',`Listening Socket on ${ PORT }`));

const io = socketIO().listen(server)

io.use(socketJwtAuth)

io.on('connection', (socket) => {
  if (socket.request.user) {
    console.log('NODEAPP','Socket Authenticated!!', socket.request.user)
    BinanceBot.setUser({
      id: socket.request.user.id,
      user: socket.request.user,
      socket: socket
    })
    BinanceTestTrade.setUser({
      id: socket.request.user.id,
      user: socket.request.user,
      socket: socket
    })
  } else {
    console.log('NODEAPP','Socket Unauthorized!!')
  }
})

setInterval(() => io.emit('server_setting', {
  time: moment().format('MM/DD HH:mm'),
  type: process.env.REAL_API
}))
server.listen(PORT, () => console.log('NODEAPP',`Listening RESTFUL on ${PORT}`))
module.exports = app
