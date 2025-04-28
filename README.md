# Game-chat-app
Altschool-third-semester-assignment

## Description
A live guessing game chat application built with Node.js, Express, Socket.io and vanilla JavaScript. Multiple users can join game rooms to play and chat in real-time.

The Gamemaster creates a room, shares the ID with players, and sets questions with 60-second timers. Players join using the room ID and can chat while waiting in the lobby/waiting room. Once the game starts, no additional players can join.

Players guess answers in real-time with correct guesses earning `10` points with `3` attempts and if no player guess the right answer within the timeframe the correct answer is display to every players and no player get the scores for that question.. After each round, a new player becomes Gamemaster. The application tracks scores, player activities, and timestamps for all actions. The session continues until all players leave.

## Features
- Real-time chat during waiting, gameplay, and After-game
- Unique game room creation and joining
- Player activity tracking with timestamps
- Score management and winner declaration
- gamemaster rotation
- options for setting up multiple questions on a go.

## setup steps
1. **Clone the repository**
```bash
https://github.com/KasperNeth/Game-chat-app.git
```
2. **Navigate to the project directory**
```bash
cd Game-chat-app
``` 
3. Install the dependencies
```bash
npm install
```
4. **Set up your .env file**
```bash
PORT = your port number
```



5. **Start the server**
```bash
npm start
```
.**For development**
```bash
npm run dev
```

6. **Run on local machine**
```bash
 http://localhost: your port number
```
