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
          placeholder="部屋の名前"
          onChange={(e) => setRoom(e.target.value)}
        />
        <button
          className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded"
          disabled={!room}
          onClick={() => socket.emit(LOGIN, { room })}
        >
          参加
        </button>
      </div>
    </div>
  )
};


const Board = ({ player, myTurn }) => {
  const [ showModal, setShowModal ] = useState(false);
  const [ modalParam, setModalParam ] = useState({});

  const meId = socket.id;
  const me = player[meId];
  const notMeId = Object.keys(player).find(p => p !== socket.id);
  const notMe = player[notMeId];

  const openModal = (param) => {
    setModalParam(param);
    setShowModal(true);
  }

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
          canDrop={myTurn}
          openModal={(param) => openModal(param)}
        />
        <Hand
          id={meId}
          hand="right"
          name={`meRight${me.right}`}
          canDrag={myTurn && me.right !== 0}
          canDrop={myTurn}
          openModal={(param) => openModal(param)}
        />
      </div>
      <p className="text-2xl text-center">{myTurn ? '自分のターン' : '相手のターン'}</p>
      {
        showModal &&
          <ActionModal
            closeModal={() => setShowModal(false)}
            actionParam={modalParam}
            me={me}
            notMe={notMe}
            notMeId={notMeId}
          />
      }
    </div>
  )
};


const Hand = ({ id, hand, name, canDrag, canDrop, openModal }) => {
  // ドラッグ設定
  const [, drag] = useDrag({
    type: 'HAND',
    canDrag: (_) => canDrag,
    end: (_, monitor) => {
      const dropResult = monitor.getDropResult();
      if (dropResult && name !== dropResult.name && id !== dropResult.id) {
        openModal({
          targetId: dropResult.id,
          fromHand: hand,
          toHand: dropResult.hand
        });
      } else if (dropResult && name !== dropResult.name && id === dropResult.id) {
        openModal({
          targetId: dropResult.id
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
      {/* TODO: 更新の度に画像をロードするので描画に少し時間がかかる（やや不快） */}
      <img ref={drag} alt={name} src={`/image/${name}.png`} />
    </div>
  );
};


const HAND_PAIR_MAP = {
  2: [{ left: 0, right: 2 }, { left: 1, right: 1 }],
  3: [{ left: 0, right: 3 }, { left: 1, right: 2 }],
  4: [{ left: 0, right: 4 }, { left: 1, right: 3 }, { left: 2, right: 2 }],
  5: [{ left: 1, right: 4 }, { left: 2, right: 3 }],
  6: [{ left: 2, right: 4 }, { left: 3, right: 3 }]
}


const ActionModal = ({ closeModal, actionParam, me, notMe, notMeId }) => {
  const [ selected, setSelected ] = useState(0);

  const isAttackAction = actionParam.targetId === notMeId;
  const hand_sum = me.left + me.right;
  const hand_pair_list = HAND_PAIR_MAP[hand_sum]
    ? HAND_PAIR_MAP[hand_sum]
      .filter(hand_pair => Math.min(me.left, me.right) !== hand_pair.left)
    : [];

  const getNewHand = (hand) => {
    if (hand === actionParam.toHand) {
      const fromHand = me[actionParam.fromHand];
      const toHand = notMe[hand];
      const newHand = (fromHand + toHand) % 5;
      return newHand;
    } else {
      return notMe[hand];
    }
  };

  const emitAction = () => {
    if (isAttackAction) {
      socket.emit(ACTION, {
        notMeId,
        targetId: actionParam.targetId,
        newLeftHand: getNewHand('left'),
        newRightHand: getNewHand('right')
      });
    } else {
      if (hand_pair_list.length === 0) return;
      socket.emit(ACTION, {
        notMeId,
        targetId: actionParam.targetId,
        newLeftHand: hand_pair_list[selected].left,
        newRightHand: hand_pair_list[selected].right
      });
    }
    closeModal();
  }

  return (
      <Modal
        handleOk={emitAction}
        handleCancel={closeModal}
      >
        <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
          {isAttackAction ? 'こうなるけどOK？' : 'どれにする？'}
        </h3>
        {isAttackAction
          ? <div>
              <div className="flex items-center justify-center my-1">
                <Hand name={`notMeRight${getNewHand('right')}`} />
                <Hand name={`notMeLeft${getNewHand('left')}`} />
              </div>
              <div className="flex items-center justify-center my-1">
                <Hand name={`meLeft${me.left}`} />
                <Hand name={`meRight${me.right}`} />
              </div>
            </div>
          : hand_pair_list.map((hand_pair, index) => (
            <div
              onClick={() => setSelected(index)}
              className={`flex items-center justify-center my-1 rounded-md ${index === selected ? 'border-solid border-4 border-blue-500' : 'border-solid border-4'}`}
            >
              <Hand name={`meLeft${hand_pair.left}`} />
              <Hand name={`meRight${hand_pair.right}`} />
            </div>
          ))}
    </Modal>
  )
}

const Modal = ({ handleOk, handleCancel, children }) => (
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            {children}
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={(handleOk)}
          >
            OK
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={handleCancel}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  </div>
)


export default App;
