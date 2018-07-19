const Sequelize = require('sequelize')
const sequelize = new Sequelize('socket', 'root', '', {
  host: 'localhost',
  port: 33306,
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  operatorsAliases: false
})

const User = sequelize.define('user', {
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  socketid: Sequelize.STRING,
  roomsocketid: Sequelize.STRING
})

const Room = sequelize.define('room', {
  name: Sequelize.STRING,
  socketid: Sequelize.STRING,
  num: Sequelize.INTEGER
})

const BinanceUser = sequelize.define('binance_user', {
  user_id: {type: Sequelize.INTEGER, primaryKey: true},
  api_key: Sequelize.STRING,
  api_secret: Sequelize.STRING
})

const UserOrder = sequelize.define('user_order', {
  user_id: {type: Sequelize.INTEGER},
  type: Sequelize.STRING,
  price: Sequelize.FLOAT,
  expect_price: Sequelize.FLOAT,
  offset: Sequelize.FLOAT,
  quantity: Sequelize.FLOAT,
  mode: Sequelize.STRING,
  pair: Sequelize.STRING,
  status: Sequelize.STRING
})
sequelize.sync()

module.exports = {
  sequelize,
  User,
  Room,
  BinanceUser,
  UserOrder
}
