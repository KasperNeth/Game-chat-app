const GameSession = require("../service/game.service");

const createSession = (sessionId, socketId, username) => {
  return new GameSession(sessionId, socketId, username);
};

const findSessionById = (sessions, sessionId) => sessions[sessionId];

const canJoinSession = (session) => session && !session.gameStarted;

const canStartGame = (session, socketId, playerCount) => 
  session && 
  socketId === session.gameMasterId && 
  playerCount >= 2;

const canSubmitGuess = (session, socketId) => 
  session && 
  session.gameStarted && 
  !session.hasWinner && 
  socketId !== session.gameMasterId &&
  session.players[socketId];

module.exports = {
  findSessionById,
  canJoinSession,
  canStartGame,
  canSubmitGuess,
  createSession
};