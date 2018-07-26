const Sequelize = require('sequelize')
const connectionString = process.env.CLEARDB_DATABASE_URL || 'mysql://root@localhost:33306/socket?reconnect=true'
const sequelize = new Sequelize(connectionString)

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
  logged_at: Sequelize.INTEGER,
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
  offset: {type: Sequelize.FLOAT},
  strategy: Sequelize.STRING,
  status: Sequelize.STRING
})

module.exports = {
  sequelize,
  User,
  Room,
  BinanceUser,
  UserOrder,
  TestBalance
}
