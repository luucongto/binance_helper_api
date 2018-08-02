const io = require('socket.io-client')
var socket = io('http://localhost:3000', {query: 'auth_token=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0b2FkbWluIiwicGFzc3dvcmQiOiIkMmIkMTAkWXNWRmYzUFdPN3hyaC9xaTJBdWVCT203UFNaZ3JwQ01rbnJGQnFMZ09lNmhnWk5qc3B2ek8iLCJzb2NrZXRpZCI6bnVsbCwicm9vbXNvY2tldGlkIjpudWxsLCJjcmVhdGVkQXQiOm51bGwsInVwZGF0ZWRBdCI6bnVsbH0.QQqLCzuo3jPbr-5mP1lVGf6fSvLFTbMsH5EB0G-PA7o'})
socket.on('time', function (timeString) {
  console.log('NODEAPP','Server time: ' + timeString)
})
socket.on('private_message', function (data) {
  console.log('NODEAPP','private_message: ', data)
})
socket.on('room_message', function (data) {
  console.log('NODEAPP','my room_message: ', data)
})
socket.emit('say to someone', 'world')

setTimeout(() => {
  socket.emit('create room', 'world2')
}, 1000)

setTimeout(() => {
  socket.emit('list room', 'world3')
}, 1000)
