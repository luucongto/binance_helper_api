'use strict';

const express = require('express')
const socketIO = require('socket.io')
const path = require('path')


const BaseApi = require( './app/SocketApi/BaseApi')
const sequelize = require( './app/Models/index')

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);


io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  let baseApi = new BaseApi(io, socket);
  // baseApi.setup();
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);