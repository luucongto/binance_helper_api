const passport = require('passport')
const {User} = require('../Models/index')
const JwtStrategy = require('passport-jwt').Strategy
var ExtractJwt = require('passport-jwt').ExtractJwt
const config = require('../config/config.js')

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  User.findOne({
    where: {
      id: id
    }
  }).then(function (user) {
    done(null, user)
  }).catch(function (err) {
    console.log(err)
  })
})
var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt')

opts.secretOrKey = config.secret
passport.use(new JwtStrategy(opts, function (jwtPayload, done) {
  User.findOne({
    where: {id: jwtPayload.id}
  }).then(user => {
    if (user) {
      done(null, user)
    } else {
      done(null, false)
    }
  }).catch(err => {
    return done(err, false)
  })
}))

module.exports = passport
