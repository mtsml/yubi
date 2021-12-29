const express = require('express');
const path = require('path');
const app = express();
const socket = require('socket.io');

app.use(express.static(path.join(__dirname, '..', 'build')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 8090;
const server = app.listen(port, () => {
    console.log(`server is running on port ${port}`)
});

const LOGIN = 'LOGIN';
const UPDATE = 'UPDATE';

const io = socket(server, {
  transports: ['websocket']
});

io.on('connection', (socket) => {
  console.log('connection');

  socket.on(LOGIN, (data) => {
    console.log(LOGIN, data)
    const { name, room } = data;
    socket.join(room);
    io.to(socket.id).emit(LOGIN, { message: "LOGIN"});
    socket.broadcast.to(room).emit(UPDATE, { message: `${name} joined room` });
  });
});