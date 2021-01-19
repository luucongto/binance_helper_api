const Sequelize = require('sequelize')
require('dotenv').config()
const connectionString = process.env.CLEARDB_DATABASE_URL || 'mysql://root:tolc@localhost:3306/binance?reconnect=true'
console.log('connectionString', connectionString)
const sequelize = new Sequelize(connectionString, {
  logging: false
})

// const sequelize = new Sequelize('socket', 'root', '', {
//   host: 'localhost',
//   port: 33306,
//   dialect: 'mysql',
//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   },
//   operatorsAliases: false
// })

const User = sequelize.define('user', {
  username: Sequelize.STRING,
  name: Sequelize.STRING,
  email: Sequelize.STRING,
  google_id: Sequelize.STRING,
  image_url: Sequelize.STRING,
  logged_at: Sequelize.INTEGER,
  password: Sequelize.STRING,
  socketid: Sequelize.STRING,
  roomsocketid: Sequelize.STRING
}, {
  indexes: [
    // Create a unique index on email
    {
      unique: true,
      fields: ['email', 'username', 'google_id']
    },
    { name: 'username', fields: ['username'] },
    { name: 'email', fields: ['email'] },
    { name: 'google_id', fields: ['google_id'] }
  ]

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
  balance_id: Sequelize.INTEGER,
  binance_order_id: Sequelize.INTEGER,
  type: Sequelize.STRING,
  price: Sequelize.FLOAT,
  expect_price: Sequelize.FLOAT,
  offset: Sequelize.FLOAT,
  quantity: Sequelize.FLOAT,
  mode: Sequelize.STRING,
  pair: Sequelize.STRING,
  status: Sequelize.STRING,
  asset: Sequelize.STRING,
  currency: Sequelize.STRING
})

const TestBalance = sequelize.define('test_balance', {
  user_id: {type: Sequelize.INTEGER},
  pair: {type: Sequelize.STRING},
  asset: Sequelize.STRING,
  currency: Sequelize.STRING,
  currency_num: Sequelize.FLOAT,
  asset_num: Sequelize.FLOAT,
  initial_currency_num: Sequelize.FLOAT,
  initial_asset_num: Sequelize.FLOAT,
  offset: {type: Sequelize.FLOAT},
  cutloss: {type: Sequelize.FLOAT},
  mode: {type: Sequelize.INTEGER},
  type: Sequelize.STRING,
  status: Sequelize.STRING
})

const BinanceTradeHistory = sequelize.define('binance_trade_history', {
  id: {type: Sequelize.INTEGER, primaryKey: true},
  asset: Sequelize.STRING,
  currency: Sequelize.STRING,
  price: Sequelize.FLOAT,
  qty: Sequelize.FLOAT,
  time: Sequelize.BIGINT,
  isBuyerMaker: Sequelize.BOOLEAN,
  isBestMatch: Sequelize.BOOLEAN
}, {
  timestamps: false,
  indexes: [
    { name: 'time', fields: ['time'] },
    { name: 'assetcurrency', fields: ['asset', 'currency'] },
    { name: 'isBuyerMaker', fields: ['isBuyerMaker'] }
  ]

})
module.exports = {
  sequelize,
  User,
  Room,
  BinanceUser,
  UserOrder,
  BinanceTradeHistory,
  TestBalance
}
