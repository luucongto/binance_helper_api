'use strict'
import passport from './app/HttpApi/passport'
import {authedRoutes, baseRoutes, binanceRoutes} from './app/HttpApi/routes'
import {sequelize} from './app/Models'
const express = require('express')
// const socketIO = require('socket.io')
// const path = require('path')
// const BaseApi = require('./app/SocketApi/BaseApi')
// const sequelize = require('./app/Models/index')
// const PORT = process.env.PORT || 3000
// const INDEX = path.join(__dirname, 'index.html')

// // IO server
// const server = express()
//   // .use((req, res) => res.sendFile(INDEX))
//   .listen(PORT, () => console.log(`Listening Socket on ${ PORT }`));

// const io = socketIO(server);

// io.on('connection', (socket) => {
//   console.log('Client connected', socket.id);
//   let baseApi = new BaseApi(io, socket);
//   // baseApi.setup();
// });

// setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

// Http Server
var app = express()
var session = require('express-session')
var bodyParser = require('body-parser')

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
app.use('/', authedRoutes)
app.use('/binance', binanceRoutes)
app.listen(3333, () => console.log(`Listening RESTFUL on 3333`))
