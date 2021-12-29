import { useState, useEffect } from "react";
import io from "socket.io-client";
import yubi from './yubi.png';

const LOGIN = 'LOGIN';
const UPDATE = 'UPDATE';
const ACTION = 'ACTION';
const END = 'END';


const host = process.env.NODE_ENV === 'production' ? window.location.origin : 'localhost:8090';
const createSocket = () => {
  return io(host, {
    transports: ['websocket']
  })
};
const socket = createSocket();

const App = () => {
  const [ login, setLogin ] = useState(false);
  const [ room, setRoom ] = useState(null);
  const [ onGame, setOnGame ] = useState(false);
  const [ myTurn, setMyTurn ] = useState(false);
  const [ player, setPlayer ] = useState({});

  useEffect(() => {
    socket.on(LOGIN, data => {
      console.log('login')
      const { room } = data;
      setRoom(room);
      setLogin(true);
    });

    socket.on(UPDATE, data => {
      console.log('update')
      const { nextPlayer, player } = data;
      setPlayer(player);
      setMyTurn(nextPlayer === socket.id);
      onGame || setOnGame(true);
    })

    socket.on(END, data => {
      console.log('end')
      const { winner, player } = data;
      setPlayer(player);
      alert(winner === socket.id ? '勝ちました' : '負けました');
      setLogin(false);
      setRoom(null);
      setOnGame(false);
      setMyTurn(false);
      setPlayer({});
    })
  }, [])

  return (
    <div className="container px-5 py-24 mx-auto">
      <h1 className="text-3xl text-center font-bold underline mb-5">Yubi Game</h1>
      {
        login
          ? <>
              <h2 className="text-2xl text-center font-bold mb-5">Room: {room}</h2>
              {
                onGame
                  ? <GameBorad room={room} player={player} myTurn={myTurn} />
                  : <p className="text-1xl text-center">waiting...</p>
              }
            </>
          : <Login />
      }
    </div>
  )
}


const GameBorad = (props) => {
  const { room, player, myTurn } = props;
  const meId = socket.id;
  const me = player[meId];
  const notMeId = Object.keys(player).find(p => p !== socket.id);
  const notMe = player[notMeId];

  return (
    <div>
      <div>
        <p>相手</p>
        左手{notMe.left}
        右手{notMe.right}
      </div>
      <div>
        <p>自分</p>
        左手{me.left}
        右手{me.right}
      </div>
      {myTurn && <Action room={room} me={me} meId={meId} notMe={notMe} notMeId={notMeId} />}
    </div>
  )
};


const Action = (props) => {
  const { room, me, meId, notMe, notMeId } = props;

  const [ step, setStep ] = useState(1);
  const [ fromHand, setFromHand ] = useState(null);
  const [ target, setTarget ] = useState(notMeId);
  const [ toHand, setToHand ] = useState(null);

  const emitAction = () => {
    socket.emit(ACTION, { room, notMeId, fromHand, target, toHand });
  }

  return (
    <>
      {step === 1 && 
        <>
          <p>使う手</p>
          <button
            disabled={me.left === 0}
            onClick={() => { setFromHand('left'); setStep(3); }}
          >
            左手
          </button>
          <button
            disabled={me.right === 0}
            onClick={() => { setFromHand('right'); setStep(3); }}
          >
            右手
          </button>
        </>
      }
      {/* 相手への攻撃のみに制限する */}
      {/* {step === 2 && 
        <>
          <p>攻撃する対象</p>
          <button onClick={() => { setTarget(notMeId); setStep(3); }}>相手</button>
          <button onClick={() => { setTarget(meId); setStep(3); }}>自分</button>
          <button onClick={() => { setStep(1); }}>戻る</button>
        </>
      } */}
      {step === 3 &&
        <>
          <p>狙う手</p>
          <button 
            disabled={notMe.left === 0}
            onClick={() => { setToHand('left'); setStep(4); }}
          >
            左手
          </button>
          <button 
            disabled={notMe.right === 0}
            onClick={() => { setToHand('right'); setStep(4); }}
          >
            右手
          </button>
          <button onClick={() => { setStep(1); }}>戻る</button>
        </>
      }
      {step === 4 && 
        <>
          <p>確認</p>
          <button onClick={emitAction}>OK</button>
          <button onClick={() => { setStep(3); }}>戻る</button>
        </>
      }
    </>
  )    
}

const Login = () => {
  const [ room, setRoom ] = useState(null); 

  const emitLogin = (room) => {
    socket.emit(LOGIN, { room });
  }
  const handleChange = (e) => {
    setRoom(e.target.value)
  }

  return (
    <div className="text-center flex flex-col justify-center items-center">
      <img alt="yubi" src={yubi} />
      <input
        className="bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
        onChange={(e) => handleChange(e)}
      />
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => emitLogin(room)}
      >
        Login
      </button>
    </div>
  )
};

export default App;
