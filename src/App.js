import { useState, useEffect } from "react";
import io from "socket.io-client";

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '8090';


const createSocket = () => {
  console.log('create connection');
  return io(`${host}:${port}`, {
    transports: ['websocket']
  })
};
const socket = createSocket();

const LOGIN = 'LOGIN';
const UPDATE = 'UPDATE';

const App = () => {
  const [login, setLogin] = useState(false);
  const [myTurn, setMyTurn] = useState(false);
  const loginEmit = () => {
    socket.emit(LOGIN, {data: 'data'});
  }
  
  useEffect(() => {
    socket.on(LOGIN, data => {
      const { message } = data;
      console.log(message);
      setLogin(true);
    })
  })

  return (
    <div>
      <h1>Yubi</h1>
      {
        login
          ? <p>login now</p>
          : <button onClick={loginEmit}>Login</button>
      }
    </div>
  )

}
      
export default App;
