import socketJwtAuth from 'socketio-jwt-auth'
import {User} from '../Models/index'
var settings = require('../config/config')
let authCheck = socketJwtAuth.authenticate({
  secret: settings.secret,    // required, used to verify the token's signature
  succeedWithoutToken: true
}, function (payload, done) {
  // you done callback will not include any payload data now
  // if no token was supplied
  if (payload && payload.id) {
    User.findOne({
      where: {
        id: payload.id,
        logged_at: payload.logged_at
      }
    }).then(user => {
      if (!user) {
        // return fail with an error message
        console.log('NODEAPP','jwtAuth no user ', payload)
        return done(null, false, 'user does not exist')
      }
      // return success with a user info
      return done(null, {id: user.id})
    }).catch(error => {
        // return error
      console.log('NODEAPP','jwtauth Error', error)
      return done(error)
    })
  } else {
    console.log('NODEAPP','jwtAuth, no payload')
    return done() // in your connection handler user.logged_in will be false
  }
})

module.exports = authCheck
