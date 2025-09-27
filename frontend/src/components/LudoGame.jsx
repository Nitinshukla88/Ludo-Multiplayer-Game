import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const BOARD_SIZE = 15;
const PLAYERS = ['red', 'blue', 'yellow', 'green'];
const PIECES_PER_PLAYER = 4;

const HOME_POSITIONS = {
  red: [[1, 1], [1, 2], [2, 1], [2, 2]],
  blue: [[1, 12], [1, 13], [2, 12], [2, 13]],
  yellow: [[12, 12], [12, 13], [13, 12], [13, 13]],
  green: [[12, 1], [12, 2], [13, 1], [13, 2]]
};

const START_POSITIONS = {
  red: [6, 1],
  blue: [1, 8],
  yellow: [8, 13],
  green: [13, 6]
};

const HOME_ENTRANCE = {
  red: [6, 0],
  blue: [0, 8],
  yellow: [8, 14],
  green: [14, 6]
};

const generatePath = (color) => {
  const paths = {
    red: [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    blue: [[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    yellow: [[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    green: [[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
  };
  return paths[color];
};

const LudoGame = () => {
  const [gameState, setGameState] = useState({
    players: {},
    currentPlayer: 'red',
    diceValue: null,
    pieces: {},
    scores: { red: 0, blue: 0, yellow: 0, green: 0 },
    gameId: null,
    myColor: null,
    isRolling: false,
    winner: null
  });

  const [lobbyState, setLobbyState] = useState({
    inLobby: true,
    rooms: [],
    playerName: '',
    roomId: null
  });

  useEffect(() => {
    const initialPieces = {};
    PLAYERS.forEach(color => {
      for (let i = 0; i < PIECES_PER_PLAYER; i++) {
        initialPieces[`${color}-${i}`] = {
          color,
          position: HOME_POSITIONS[color][i],
          isHome: true,
          isFinished: false,
          pathIndex: -1
        };
      }
    });
    setGameState(prev => ({ ...prev, pieces: initialPieces }));
  }, []);

  useEffect(() => {
    socket.on('roomsList', (rooms) => {
      setLobbyState(prev => ({ ...prev, rooms }));
    });

    socket.on('gameJoined', ({ roomId, color, players, gameState: serverGameState }) => {
      setLobbyState(prev => ({ ...prev, inLobby: false, roomId }));
      setGameState(prev => ({
        ...prev,
        gameId: roomId,
        myColor: color,
        players,
        ...serverGameState
      }));
    });

    socket.on('gameStateUpdate', (newGameState) => {
      setGameState(prev => ({
        ...prev,
        ...newGameState
      }));
    });

    socket.on('diceRolled', ({ value, nextPlayer }) => {
      setGameState(prev => ({
        ...prev,
        diceValue: value,
        currentPlayer: nextPlayer,
        isRolling: false
      }));
    });

    socket.on('piecesMoved', ({ pieces, scores, captures }) => {
      setGameState(prev => ({
        ...prev,
        pieces,
        scores
      }));
      
      if (captures && captures.length > 0) {
        captures.forEach(capture => {
          console.log(`${capture.capturer} captured ${capture.captured}!`);
        });
      }
    });

    socket.on('gameWon', ({ winner, finalScores }) => {
      setGameState(prev => ({
        ...prev,
        winner,
        scores: finalScores
      }));
    });

    socket.on('playerDisconnected', ({ color }) => {
      console.log(`Player ${color} disconnected`);
    });

    return () => {
      socket.off('roomsList');
      socket.off('gameJoined');
      socket.off('gameStateUpdate');
      socket.off('diceRolled');
      socket.off('piecesMoved');
      socket.off('gameWon');
      socket.off('playerDisconnected');
    };
  }, []);

  const createRoom = () => {
    if (lobbyState.playerName.trim()) {
      socket.emit('createRoom', { playerName: lobbyState.playerName });
    }
  };

  const joinRoom = (roomId) => {
    if (lobbyState.playerName.trim()) {
      socket.emit('joinRoom', { roomId, playerName: lobbyState.playerName });
    }
  };

  const rollDice = () => {
    if (gameState.currentPlayer === gameState.myColor && !gameState.isRolling) {
      setGameState(prev => ({ ...prev, isRolling: true }));
      socket.emit('rollDice', { roomId: gameState.gameId });
    }
  };

  const movePiece = (pieceId) => {
    if (gameState.currentPlayer !== gameState.myColor || !gameState.diceValue) return;
    
    const piece = gameState.pieces[pieceId];
    if (!piece || piece.color !== gameState.myColor) return;

    socket.emit('movePiece', {
      roomId: gameState.gameId,
      pieceId,
      diceValue: gameState.diceValue
    });
  };

  const getCellColor = (row, col) => {
  if (row < 6 && col < 6) return 'bg-red-300';
  if (row < 6 && col > 8) return 'bg-blue-300';
  if (row > 8 && col > 8) return 'bg-yellow-300';
  if (row > 8 && col < 6) return 'bg-green-300';

  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return 'bg-gray-400';
  if (row === 7 && col < 6) return 'bg-red-200';
  if (col === 7 && row < 6) return 'bg-blue-200';
  if (row === 7 && col > 8) return 'bg-yellow-200';
  if (col === 7 && row > 8) return 'bg-green-200';

  if ((row === 7 && col >= 6 && col <= 8) ||
      (col === 7 && row >= 6 && row <= 8)) {
    return 'bg-white';
  }

  return 'bg-white';
};


  const renderPiece = (row, col) => {
    const pieces = Object.entries(gameState.pieces).filter(([_, piece]) => 
      piece.position[0] === row && piece.position[1] === col && !piece.isFinished
    );

    if (pieces.length === 0) return null;

    return pieces.map(([pieceId, piece]) => (
      <div
        key={pieceId}
        className={`absolute w-6 h-6 rounded-full border-2 border-gray-800 cursor-pointer transform hover:scale-110 transition-transform
          ${piece.color === 'red' ? 'bg-red-500' : ''}
          ${piece.color === 'blue' ? 'bg-blue-500' : ''}
          ${piece.color === 'yellow' ? 'bg-yellow-500' : ''}
          ${piece.color === 'green' ? 'bg-green-500' : ''}
          ${piece.color === gameState.myColor ? 'cursor-pointer' : 'cursor-not-allowed'}
        `}
        style={{
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${pieces.indexOf([pieceId, piece]) * 8}px, 0)`
        }}
        onClick={() => movePiece(pieceId)}
      >
        <span className="text-xs text-white font-bold flex items-center justify-center h-full">
          {pieceId.split('-')[1]}
        </span>
      </div>
    ));
  };

  if (lobbyState.inLobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Multiplayer Ludo</h1>
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter your name"
              value={lobbyState.playerName}
              onChange={(e) => setLobbyState(prev => ({ ...prev, playerName: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={createRoom}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors mb-4"
          >
            Create New Room
          </button>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-3">Available Rooms</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lobbyState.rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Room {room.id}</p>
                    <p className="text-sm text-gray-600">Players: {room.players}/4</p>
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    disabled={room.players >= 4}
                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Join
                  </button>
                </div>
              ))}
              {lobbyState.rooms.length === 0 && (
                <p className="text-gray-500 text-center py-4">No rooms available. Create one!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Ludo Game - Room {gameState.gameId}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold">
                You are: <span className={`text-${gameState.myColor}-500`}>{gameState.myColor}</span>
              </span>
              <span className="text-lg">
                Current Turn: <span className={`text-${gameState.currentPlayer}-500 font-bold`}>
                  {gameState.currentPlayer}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {PLAYERS.map(color => (
              <div
                key={color}
                className={`p-2 rounded-lg text-center ${
                  gameState.currentPlayer === color ? 'ring-2 ring-yellow-400' : ''
                }`}
                style={{
                  backgroundColor: color === 'red' ? '#FEE2E2' :
                                  color === 'blue' ? '#DBEAFE' :
                                  color === 'yellow' ? '#FEF3C7' :
                                  '#D1FAE5'
                }}
              >
                <p className="font-semibold capitalize">{color}</p>
                <p className="text-2xl font-bold">{gameState.scores[color]}</p>
                <p className="text-xs text-gray-600">
                  {gameState.players[color] || 'Waiting...'}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative bg-gray-100 p-2 rounded-lg">
                <div className="grid grid-cols-15 gap-0.5" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
                  {Array.from({ length: BOARD_SIZE }, (_, row) => (
                    Array.from({ length: BOARD_SIZE }, (_, col) => (
                      <div
                        key={`${row}-${col}`}
                        className={`relative aspect-square border border-gray-400 ${getCellColor(row, col)}`}
                      >
                        {renderPiece(row, col)}
                      </div>
                    ))
                  ))}
                </div>
              </div>
            </div>

            <div className="w-48 space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Dice</h3>
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-lg shadow-md flex items-center justify-center mb-4">
                    {gameState.isRolling ? (
                      <div className="animate-spin text-3xl">🎲</div>
                    ) : (
                      <span className="text-4xl font-bold">
                        {gameState.diceValue || '?'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={rollDice}
                    disabled={gameState.currentPlayer !== gameState.myColor || gameState.isRolling}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {gameState.isRolling ? 'Rolling...' : 'Roll Dice'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Game Info</h3>
                <div className="space-y-1 text-sm">
                  <p>• Click dice to roll</p>
                  <p>• Click your pieces to move</p>
                  <p>• Get 6 to leave home</p>
                  <p>• Capture opponents for points</p>
                </div>
              </div>

              {gameState.winner && (
                <div className="bg-yellow-100 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Game Over!</h3>
                  <p className="text-center">
                    Winner: <span className={`font-bold text-${gameState.winner}-500`}>
                      {gameState.winner}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LudoGame;