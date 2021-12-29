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
const ACTION = 'ACTION';
const END = 'END';

const rooms = {};


const io = socket(server, {
  transports: ['websocket']
});

io.on('connection', (socket) => {
  console.log('connection');

  socket.on(LOGIN, (data) => {
    console.log(LOGIN, data)
    const { room } = data;

    joinRoom(socket, room);
    io.to(socket.id).emit(LOGIN, { room });
    if (Object.keys(rooms[room].player).length === 2) {
      io.to(room).emit(UPDATE, rooms[room]);
    }
  });

  socket.on(ACTION, (data) => {
    console.log(ACTION, data)
    const { room, notMeId, fromHand, target, toHand } = data;
    const player = rooms[room].player;
    const meId = socket.id;
    const me = player[meId]; 
    const notMe = player[notMeId];

    // 自分への攻撃
    if (meId === target) {
        
    }
    // 相手への攻撃
    else {
      const fromHandNumber = me[fromHand];
      const toHandNumber = notMe[toHand];
      const newHandNumber = (fromHandNumber + toHandNumber) % 5;
      rooms[room].player[notMeId][toHand] = newHandNumber;
      rooms[room].nextPlayer = notMeId;
    }

    const winner = judge(me, meId, notMe, notMeId);
    if (winner) {
      io.to(room).emit(END, { winner, player: rooms[room].player });
      io.in(room).socketsLeave(room);
      delete rooms[room];
    } else {
      io.to(room).emit(UPDATE, rooms[room]);
    }
  });
});


const joinRoom = (socket, room) => {
  if (!rooms[room]) {
    rooms[room] = {
      nextPlayer: socket.id,
      player: {}
    }
  }
  rooms[room].player[socket.id] = {
    left: 1,
    right: 1
  };
  socket.join(room);
};


const judge = (me, meId, notMe, notMeId) => {
  if (me.left === 0 && me.right === 0) {
    return notMeId;
  }
  if (notMe.left === 0 && notMe.right === 0) {
    return meId;
  }
  return false;
};
