const Sequelize = require( 'sequelize')
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
});

const User = sequelize.define('user', {
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  socketid: Sequelize.STRING,
  roomsocketid: Sequelize.STRING,
});

const Room = sequelize.define('room', {
  name: Sequelize.STRING,
  socketid: Sequelize.STRING,
  num: Sequelize.INTEGER
})
sequelize.sync()
  

module.exports = {
  User,
  Room
}