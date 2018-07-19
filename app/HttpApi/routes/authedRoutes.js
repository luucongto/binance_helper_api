var express = require('express')

var router = express.Router()
router.get('/profile', function (req, res) {
  res.send('Authenticated Profile')
})

module.exports = router
