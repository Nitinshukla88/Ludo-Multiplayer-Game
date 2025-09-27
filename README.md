# Multiplayer Ludo Game (MERN + Socket.IO)

A real-time multiplayer Ludo game built with React, Node.js, Express, and Socket.IO featuring live scoring, capture mechanics, and room-based gameplay.

## Features

- **Multiplayer Support**: Up to 4 players per room
- **Real-time Gameplay**: Live updates using Socket.IO
- **Scoring System**: 
  - 10 points for leaving home
  - Points equal to dice value for movement
  - 20 points for capturing opponents
  - 50 points for reaching finish
  - 100 bonus points for winning
- **Room System**: Create and join game rooms
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
ludo-game/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── LudoGame.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
│
└── backend/               # Node.js + Express + Socket.IO
    ├── server.js
    └── package.json
```

## Installation & Setup
<!-- 
### Prerequisites
- Node.js (v14 or higher)
- npm or yarn -->

### Backend Setup

1. Create backend directory and navigate to it:
```bash
mkdir backend
cd backend
```

2. Create `package.json` and `server.js` files with the provided code

3. Install dependencies:
```bash
npm install
```

4. Start the backend server:
```bash
npm run dev  # For development with nodemon
# or
npm start    # For production
```

The backend server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## How to Play

1. **Enter Your Name**: Type your name in the lobby screen
2. **Create or Join Room**: 
   - Click "Create New Room" to start a new game
   - Or join an existing room from the list
3. **Wait for Players**: Game starts when players join (can play with 2-4 players)
4. **Game Rules**:
   - Roll dice to determine moves
   - Get a 6 to move a piece out of home
   - Click on your pieces to move them
   - Capture opponent pieces by landing on them
   - First player to get all 4 pieces to finish wins

## Game Controls

- **Roll Dice**: Click the "Roll Dice" button when it's your turn
- **Move Piece**: Click on your colored pieces to move them
- **View Scores**: Real-time scores displayed for each player

<!-- ## Scoring System

| Action | Points |
|--------|--------|
| Leaving Home | 10 |
| Movement | Equal to dice value |
| Capturing Opponent | 20 |
| Piece Finishing | 50 |
| Winning Game | 100 | -->

## Technical Stack

### Frontend
- **React 18**: UI library
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Socket.IO Client**: Real-time communication

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **Socket.IO**: WebSocket library for real-time updates
- **CORS**: Cross-origin resource sharing

## API Events

### Client → Server
- `createRoom`: Create a new game room
- `joinRoom`: Join an existing room
- `rollDice`: Roll the dice
- `movePiece`: Move a game piece

### Server → Client
- `roomsList`: List of available rooms
- `gameJoined`: Confirmation of joining a game
- `gameStateUpdate`: Full game state synchronization
- `diceRolled`: Dice roll result
- `piecesMoved`: Piece position updates
- `gameWon`: Game end notification
- `playerDisconnected`: Player disconnect notification

## Development

### Running in Development Mode

1. Start backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

Frontend build:
```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
NODE_ENV=development
```

## Troubleshooting

<!-- ### Common Issues

1. **Socket connection fails**:
   - Ensure backend is running on port 3001
   - Check CORS settings in backend
   - Verify Socket.IO versions match

2. **Styles not loading**:
   - Run `npm install` in frontend
   - Ensure Tailwind CSS is properly configured

3. **Game state not syncing**:
   - Check network tab for WebSocket connections
   - Verify room ID is correct
   - Check console for error messages -->
<!-- 
## Future Enhancements

- [ ] Database integration for persistent game state
- [ ] User authentication system
- [ ] Game replay functionality
- [ ] AI players for single-player mode
- [ ] Tournament mode
- [ ] Chat system
- [ ] Sound effects and animations
- [ ] Mobile app versions -->
<!-- 
## Contributing

Feel free to fork this project and submit pull requests for any improvements. -->

## License

MIT License