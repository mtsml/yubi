import { useState, useEffect } from "react";
import io from "socket.io-client";


const LOGIN = 'LOGIN';
const UPDATE = 'UPDATE';
const ACTION = 'ACTION';
const END = 'END';


const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '8090';
const createSocket = () => {
  console.log('create connection');
  return io(`${host}:${port}`, {
    transports: ['websocket']
  })
};
const socket = createSocket();


const App = () => {
  const [ login, setLogin ] = useState(false);
  const [ room, setRoom ] =useState(null);
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
    })
  }, [])

  return (
    <div>
      <h1>Yubi Game</h1>
      {
        login
          ? <>
              <h2>Room: {room}</h2>
              {
                onGame
                  ? <GameBorad room={room} player={player} myTurn={myTurn} />
                  : <p>waiting...</p>
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
  const [ target, setTarget ] = useState(null);
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
            onClick={() => { setFromHand('left'); setStep(2); }}
          >
            左手
          </button>
          <button
            disabled={me.right === 0}
            onClick={() => { setFromHand('right'); setStep(2); }}
          >
            右手
          </button>
        </>
      }
      {step === 2 && 
        <>
          <p>攻撃する対象</p>
          <button onClick={() => { setTarget(notMeId); setStep(3); }}>相手</button>
          <button onClick={() => { setTarget(meId); setStep(3); }}>自分</button>
          <button onClick={() => { setStep(1); }}>戻る</button>
        </>
      }
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
          <button onClick={() => { setStep(2); }}>戻る</button>
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
    <>
      <input label='room' onChange={(e) => handleChange(e)} />
      <button onClick={() => emitLogin(room)}>Login</button>
    </>
  )
};

export default App;
