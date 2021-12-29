import { Component } from "react";
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

class App extends Component {

  render() {
    return (
      <div>
        yubi
      </div>
    );
  }
}

export default App;
