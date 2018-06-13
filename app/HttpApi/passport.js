var LocalStrategy = require('passport-local').Strategy;
var passport = require('passport');
var bcrypt = require('bcrypt');
const {User} = require('../Models/index')
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt
const config = require('../config/config.js')

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findOne({
      where : {
        id: id
      }
    }).then(function (user) {
        done(null, user);
    }).catch(function (err) {
        console.log(err);
    })
});
var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
opts.secretOrKey = config.secret;
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    User.findOne({
      where: {id: jwt_payload.id}
      }).then(user => {
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      }).catch( err => {
        return done(err, false);
      });
  }));

// passport.use(new LocalStrategy(
//     function (username,password,done) {
//         User.findOne({where : {
//             username : username
//         }}).then(function (user) {
//             bcrypt.compare(password, user.password, function (err,result) {
//                 if (err) { return done(err); }
//                 if(!result) {
//                     return done(null, false, { message: 'Incorrect username and password' });
//                 }
//                 return done(null, user);
//             })
//         }).catch(function (err) {
//             return done(err);
//         })
//     }
// ))