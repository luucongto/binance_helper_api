const io = require('socket.io-client');
var socket = io('http://localhost:3000');
socket.on('time', function (timeString) {
  console.log( 'Server time: ' + timeString);
});
socket.on('private_message', function (data) {
  console.log('private_message: ', data);
});
socket.on('room_message', function (data) {
  console.log('my room_message: ', data);
});
socket.emit('say to someone', 'world');

setTimeout(() => {
  socket.emit('create room', 'world2');
}, 1000);

setTimeout(() => {
  socket.emit('list room', 'world3');
}, 1000);