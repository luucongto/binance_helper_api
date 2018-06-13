
var express = require('express')
var passport = require('passport')
var router = express.Router();
var User = require('../Models').User
var settings = require('../config/config')
var jwt = require('jsonwebtoken');

var authCheck = function(req, res, next){
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/login");
  }
}

router.get('/', function (req, res) {
  res.send("Hello")
})

router.get('/profile', [authCheck], function (req, res) {
  res.send("profile")
})

router.get('/login', function (req, res) {
  res.send("login")
})

router.post('/login',
  function (req, res) {
    User.findOne({
      where : {
        username: req.body.username
      }
    }).then( user => {
      user = user.get()
      if (!user) {
        res.status(401).send({
          success: false,
          msg: 'Authentication failed. User not found.'
        });
      } else {
        
        // check if password matches
        bcrypt.compare(req.body.password, user.password, function (err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            var token = jwt.sign(JSON.stringify(user), settings.secret);
            // return the information including token as JSON
            res.json({
              success: true,
              token: token
            });
          } else {
            res.status(401).send({
              success: false,
              msg: 'Authentication failed. Wrong password.'
            });
          }
        });
      }
    }).catch( err => {
      console.log(err)
      res.status(401).send({
        success: false,
        msg: 'Authentication failed. Wrong password.'
      });
    })
  });

module.exports = router;