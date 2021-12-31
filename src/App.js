import { useState, useEffect } from "react";
import { useDrag, useDrop } from 'react-dnd';
import io from "socket.io-client";


const LOGIN = 'LOGIN';
const UPDATE = 'UPDATE';
const ACTION = 'ACTION';
const END = 'END';
const ERROR = 'ERROR';


const host = process.env.NODE_ENV === 'production' ? window.location.origin : 'localhost:8090';
const createSocket = () => io(host, {
  transports: ['websocket']
});
const socket = createSocket();


const App = () => {
  const [ login, setLogin ] = useState(false);
  const [ onGame, setOnGame ] = useState(false);
  const [ myTurn, setMyTurn ] = useState(false);
  const [ player, setPlayer ] = useState({});

  useEffect(() => {
    socket.on(LOGIN, () => {
      console.log('login');
      setLogin(true);
    });

    socket.on(UPDATE, ({ nextPlayer, player }) => {
      console.log('update');
      setPlayer(player);
      setMyTurn(nextPlayer === socket.id);
      onGame || setOnGame(true);
    });

    socket.on(END, ({ winner, player }) => {
      console.log('end');
      setPlayer(player);
      alert(winner === socket.id ? '勝ちました' : '負けました');
      setLogin(false);
      setOnGame(false);
      setMyTurn(false);
      setPlayer({});
    });

    socket.on(ERROR, ({ message }) => {
      console.log('error');
      alert(message);
      setLogin(false);
      setOnGame(false);
      setMyTurn(false);
      setPlayer({});      
    });
  }, [])

  return (
    <div className="container py-5 mx-auto my-auto">
      <h1 className="text-3xl text-center font-bold underline">YubiGame</h1>
      {login
        ? onGame
          ? <Board player={player} myTurn={myTurn} />
          : <p className="text-2xl text-center mt-3">挑戦者求ム...</p>
        : <Login />
      }
    </div>
  )
}


const Login = () => {
  const [ room, setRoom ] = useState(null);

  return (
    <div className="text-center flex flex-col justify-center items-center">
      <img alt="logo" src="/image/logo.png" />
      <div className="flex items-center border-b border-blue-500 py-2">
        <input
          className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
          placeholder="Room Name"
          onChange={(e) => setRoom(e.target.value)}
        />
        <button
          className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded"
          disabled={!room}
          onClick={() => socket.emit(LOGIN, { room })}
        >
          Join
        </button>
      </div>
    </div>
  )
};


const Board = ({ player, myTurn }) => {
  const [ actionParam, setActionParam ] = useState(null);

  const meId = socket.id;
  const me = player[meId];
  const notMeId = Object.keys(player).find(p => p !== socket.id);
  const notMe = player[notMeId];

  const emitAction = () => {
    socket.emit(ACTION, actionParam);
    setActionParam(null);
  };

  return (
    <div>
      <div className="flex items-center justify-center my-1">
        <Hand
          id={notMeId}
          hand="right"
          name={`notMeRight${notMe.right}`}
          canDrag={false}
          canDrop={myTurn && notMe.right !== 0}
        />
        <Hand
          id={notMeId}
          hand="left"
          name={`notMeLeft${notMe.left}`}
          canDrag={false}
          canDrop={myTurn && notMe.left !== 0}
        />
      </div>
      <div className="flex items-center justify-center my-1">
        <Hand
          id={meId}
          hand="left"
          name={`meLeft${me.left}`}
          canDrag={myTurn && me.left !== 0}
          canDrop={myTurn && me.left !== 0}
          callback={(data) => { setActionParam({ notMeId, ...data })}}
        />
        <Hand
          id={meId}
          hand="right"
          name={`meRight${me.right}`}
          canDrag={myTurn && me.right !== 0}
          canDrop={myTurn && me.right !== 0}
          callback={(data) => { setActionParam({ notMeId, ...data })}}
        />
      </div>
      {
        myTurn
          ? <div className=" flex flex-col justify-center items-center">
              <p className="text-2xl">ドラッグ＆ドロップで攻撃！</p>
              {actionParam &&
                <>
                  <p className="text-2xl my-2">
                    {`${{ left: '左手', right: '右手' }[actionParam.fromHand]}
                    →
                    ${{ left: '左手', right: '右手' }[actionParam.toHand]}`}
                  </p>
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={emitAction}
                  >
                    OK
                  </button>
                </>
              }
            </div>
          : <p className="text-2xl text-center">相手が悩み中...</p>
      }
    </div>
  )
};


const Hand = ({ id, hand, name, canDrag, canDrop, callback }) => {
  // ドラッグ設定
  const [, drag] = useDrag({
    type: 'HAND',
    canDrag: (_) => canDrag,
    end: (_, monitor) => {
      const dropResult = monitor.getDropResult();
      // TODO: 自分への攻撃を実装する
      if (dropResult && name !== dropResult.name && id !== dropResult.id) {
        callback({
          fromHand: hand, 
          target: dropResult.id,
          toHand: dropResult.hand
        });
      }
    }
  });
  // ドロップ設定
  const [, drop] = useDrop({
    accept: 'HAND',
    canDrop: (_,) => canDrop,
    drop: () => ({ id, name, hand }),
  });

  return (
    <div ref={drop}>
      <img ref={drag} alt={name} src={`/image/${name}.png`} />
    </div>
  );
};


export default App;
