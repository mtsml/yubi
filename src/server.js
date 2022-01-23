const express = require('express');
const path = require('path');
const socket = require('socket.io');


const app = express();
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
const ERROR = 'ERROR';

const rooms = {};
const io = socket(server, { transports: ['websocket'] });

io.on('connection', (socket) => {
  console.log('connection');

  socket.on(LOGIN, (data) => {
    console.log(LOGIN, data);
    const { room } = data;
    
    const joined = joinRoom(socket, room);
    if (joined) {
      io.to(socket.id).emit(LOGIN);
      if (Object.keys(rooms[room].player).length === 2) {
        io.to(room).emit(UPDATE, rooms[room]);
      }
    } else {
      io.to(socket.id).emit(ERROR, { message: '定員オーバーです。。。' });
    }
  });

  socket.on(ACTION, (data) => {
    console.log(ACTION, data);
    const { notMeId, targetId, newLeftHand, newRightHand } = data;

    const room = getRoom(socket);
    const player = rooms[room].player;
    const meId = socket.id;
    const me = player[meId];
    const notMe = player[notMeId];

    rooms[room].player[targetId].left = newLeftHand;
    rooms[room].player[targetId].right = newRightHand;
    rooms[room].nextPlayer = notMeId;

    const winner = judge(me, meId, notMe, notMeId);
    if (winner) {
      io.to(room).emit(END, { winner, player: rooms[room].player });
      io.in(room).socketsLeave(room);
      delete rooms[room];
    } else {
      io.to(room).emit(UPDATE, rooms[room]);
    }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit(ERROR, { message: '深刻なエラーが発生しました。。。'});
        io.in(room).socketsLeave(room);
        delete rooms[room];
      }
    }
  });
});


const joinRoom = (socket, room) => {
  if (!rooms[room]) {
    rooms[room] = {
      nextPlayer: socket.id,
      player: {
        [socket.id]: {
          left: 1,
          right: 1
        }
      }
    }
  } else if (Object.keys(rooms[room].player).length === 1) {
    rooms[room].player[socket.id] = {
      left: 1,
      right: 1
    };
  } else {
    return false;
  }
  socket.join(room);
  return true;
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


const getRoom = (socket) => {
  let room;
  socket.rooms.forEach(r => {
    if (r !== socket.id) {
      room = r;
    }
  });
  return room;
}
