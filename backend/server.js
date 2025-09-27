const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Game state management
const rooms = new Map();
const playerRooms = new Map();

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.colors = ['red', 'blue', 'yellow', 'green'];
    this.availableColors = [...this.colors];
    this.gameState = {
      currentPlayer: 'red',
      diceValue: null,
      pieces: this.initializePieces(),
      scores: { red: 0, blue: 0, yellow: 0, green: 0 },
      winner: null,
      turnCount: 0
    };
    
  }

  initializePieces() {
    const pieces = {};
    const homePositions = {
      red: [[1, 1], [1, 2], [2, 1], [2, 2]],
      blue: [[1, 12], [1, 13], [2, 12], [2, 13]],
      yellow: [[12, 12], [12, 13], [13, 12], [13, 13]],
      green: [[12, 1], [12, 2], [13, 1], [13, 2]]
    };

    this.colors.forEach(color => {
      for (let i = 0; i < 4; i++) {
        pieces[`${color}-${i}`] = {
          color,
          position: homePositions[color][i],
          isHome: true,
          isFinished: false,
          pathIndex: -1
        };
      }
    });

    return pieces;
  }

  addPlayer(socketId, playerName) {
    if (this.availableColors.length === 0) return null;
    
    const color = this.availableColors.shift();
    this.players.set(socketId, {
      id: socketId,
      name: playerName,
      color: color,
      connected: true
    });
    
    return color;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      this.availableColors.push(player.color);
      this.players.delete(socketId);
    }
  }

  rollDice() {
    const value = Math.floor(Math.random() * 6) + 1;
    this.gameState.diceValue = value;
    
    // Calculate next player
    const currentIndex = this.colors.indexOf(this.gameState.currentPlayer);
    let nextIndex = (currentIndex + 1) % 4;
    let nextPlayer = this.colors[nextIndex];
    
    // Skip players who aren't in the game
    while (!this.hasPlayer(nextPlayer) && nextIndex !== currentIndex) {
      nextIndex = (nextIndex + 1) % 4;
      nextPlayer = this.colors[nextIndex];
    }
    
    return { value, nextPlayer };
  }

  hasPlayer(color) {
    for (let player of this.players.values()) {
      if (player.color === color) return true;
    }
    return false;
  }

  movePiece(pieceId, diceValue) {
    const piece = this.gameState.pieces[pieceId];
    if (!piece) return null;

    let captures = [];

    const startPositions = {
      red: [6, 1],
      blue: [1, 8],
      yellow: [8, 13],
      green: [13, 6]
    };

    if (piece.isHome && diceValue === 6) {
      piece.position = startPositions[piece.color];
      piece.isHome = false;
      piece.pathIndex = 0;

      this.gameState.scores[piece.color] += 10;
    } else if (!piece.isHome && !piece.isFinished) {
      piece.pathIndex += diceValue;
      
      const captures = this.checkCaptures(pieceId);
      if (captures.length > 0) {
        captures.forEach(capturedId => {
          const capturedPiece = this.gameState.pieces[capturedId];
          const homePositions = {
            red: [[1, 1], [1, 2], [2, 1], [2, 2]],
            blue: [[1, 12], [1, 13], [2, 12], [2, 13]],
            yellow: [[12, 12], [12, 13], [13, 12], [13, 13]],
            green: [[12, 1], [12, 2], [13, 1], [13, 2]]
          };
          const pieceNum = parseInt(capturedId.split('-')[1]);
          capturedPiece.position = homePositions[capturedPiece.color][pieceNum];
          capturedPiece.isHome = true;
          capturedPiece.pathIndex = -1;
          
          this.gameState.scores[piece.color] += 20;
        });
      }
      
      this.gameState.scores[piece.color] += diceValue;
      
      this.updatePiecePosition(piece);
      
      if (piece.pathIndex >= 57) {
        piece.isFinished = true;
        this.gameState.scores[piece.color] += 50;
        
        if (this.checkWinCondition(piece.color)) {
          this.gameState.winner = piece.color;
          this.gameState.scores[piece.color] += 100;
        }
      }
    }

    if (diceValue !== 6) {
      const currentIndex = this.colors.indexOf(this.gameState.currentPlayer);
      let nextIndex = (currentIndex + 1) % 4;
      let nextPlayer = this.colors[nextIndex];
      
      while (!this.hasPlayer(nextPlayer) && nextIndex !== currentIndex) {
        nextIndex = (nextIndex + 1) % 4;
        nextPlayer = this.colors[nextIndex];
      }
      
      this.gameState.currentPlayer = nextPlayer;
    }

    this.gameState.diceValue = null;
    
    return {
      pieces: this.gameState.pieces,
      scores: this.gameState.scores,
      captures
    };
  }

  updatePiecePosition(piece) {
    const paths = {
      red: [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6]],
      blue: [[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13]],
      yellow: [[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8]],
      green: [[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1]]
    };
    
    const colorPath = paths[piece.color];
    if (piece.pathIndex < colorPath.length) {
      piece.position = colorPath[Math.min(piece.pathIndex, colorPath.length - 1)];
    }
  }

  checkCaptures(pieceId) {
    const piece = this.gameState.pieces[pieceId];
    const captures = [];
    
    // Check if this piece lands on another piece
    Object.entries(this.gameState.pieces).forEach(([otherId, otherPiece]) => {
      if (otherId !== pieceId && 
          otherPiece.color !== piece.color &&
          !otherPiece.isHome &&
          !otherPiece.isFinished &&
          otherPiece.position[0] === piece.position[0] &&
          otherPiece.position[1] === piece.position[1]) {
        captures.push(otherId);
      }
    });
    
    return captures;
  }

  checkWinCondition(color) {
    let finishedCount = 0;
    for (let i = 0; i < 4; i++) {
      if (this.gameState.pieces[`${color}-${i}`].isFinished) {
        finishedCount++;
      }
    }
    return finishedCount === 4;
  }

  getPlayersInfo() {
    const info = {};
    this.players.forEach(player => {
      info[player.color] = player.name;
    });
    return info;
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current rooms list
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    players: room.players.size
  }));
  socket.emit('roomsList', roomsList);

  socket.on('createRoom', ({ playerName }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new GameRoom(roomId);
    const color = room.addPlayer(socket.id, playerName);
    
    rooms.set(roomId, room);
    playerRooms.set(socket.id, roomId);
    
    socket.join(roomId);
    
    socket.emit('gameJoined', {
      roomId,
      color,
      players: room.getPlayersInfo(),
      gameState: room.gameState
    });

    // Broadcast updated rooms list
    io.emit('roomsList', Array.from(rooms.values()).map(r => ({
      id: r.id,
      players: r.players.size
    })));
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.players.size >= 4) {
      socket.emit('error', 'Room is full');
      return;
    }

    const color = room.addPlayer(socket.id, playerName);
    playerRooms.set(socket.id, roomId);
    
    socket.join(roomId);
    
    socket.emit('gameJoined', {
      roomId,
      color,
      players: room.getPlayersInfo(),
      gameState: room.gameState
    });

    // Notify other players
    socket.to(roomId).emit('gameStateUpdate', {
      players: room.getPlayersInfo(),
      gameState: room.gameState
    });

    // Broadcast updated rooms list
    io.emit('roomsList', Array.from(rooms.values()).map(r => ({
      id: r.id,
      players: r.players.size
    })));
  });

  socket.on('rollDice', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || player.color !== room.gameState.currentPlayer) return;

    const { value, nextPlayer } = room.rollDice();
    
    io.to(roomId).emit('diceRolled', {
      value,
      nextPlayer
    });
  });

  socket.on('movePiece', ({ roomId, pieceId, diceValue }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    const piece = room.gameState.pieces[pieceId];
    
    if (!player || !piece || player.color !== piece.color) return;
    if (player.color !== room.gameState.currentPlayer) return;

    const result = room.movePiece(pieceId, diceValue);
    
    if (result) {
      io.to(roomId).emit('piecesMoved', result);
      
      if (room.gameState.winner) {
        io.to(roomId).emit('gameWon', {
          winner: room.gameState.winner,
          finalScores: room.gameState.scores
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.get(socket.id);
        if (player) {
          socket.to(roomId).emit('playerDisconnected', {
            color: player.color
          });
          
          room.removePlayer(socket.id);
          playerRooms.delete(socket.id);
          
          // Remove room if empty
          if (room.players.size === 0) {
            rooms.delete(roomId);
          }
          
          // Broadcast updated rooms list
          io.emit('roomsList', Array.from(rooms.values()).map(r => ({
            id: r.id,
            players: r.players.size
          })));
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});