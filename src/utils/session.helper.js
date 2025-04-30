const GameSession = require("../service/game.service");
const { formatTimestamp } = require("../utils/session");

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

  const handleNextQuestionOrRotate = (session, sessionId, io) => {
    const hasMoreQuestions = session.moveToNextQuestion();
    
    if (hasMoreQuestions) {
      // Start new round with next question
      const nextQuestion = session.getCurrentQuestion();
      session.startGame(nextQuestion.question, nextQuestion.answer);
      
      io.to(sessionId).emit("game_started", {
        question: nextQuestion.question,
        timeRemaining: session.timeLimit
      });
      
      // Send system message about new question
      io.to(sessionId).emit("chat_message", {
        isSystem: true,
        content: "Next question! Try to guess the answer.",
        timestamp: formatTimestamp()
      });
      
      // Activity log
      io.to(sessionId).emit("activity_log", {
        message: "Starting next question",
        timestamp: formatTimestamp()
      });
      
      session.startTimer(
        () => {
          io.to(sessionId).emit("time_update", { 
            timeRemaining: session.timeRemaining 
          });
        },
        () => {
          // Timer complete callback for next question
          io.to(sessionId).emit("game_ended", {
            winner: null,
            answer: session.answer,
            scores: session.getScores()
          });
          
          // System message about time running out
          io.to(sessionId).emit("chat_message", {
            isSystem: true,
            content: `Time's up! The correct answer was: ${session.answer}`,
            timestamp: formatTimestamp()
          });
          
          // Check for more questions in the game
          handleNextQuestionOrRotate(session, sessionId, io);
        }
      );
    } else {
      // No more questions, rotate game master
      session.rotateGameMaster();
      
      io.to(sessionId).emit("game_master_changed", {
        gameMasterId: session.gameMasterId,
        gameMasterName: session.players[session.gameMasterId].username
      });
    }
  };
  

module.exports = {
  findSessionById,
  canJoinSession,
  canStartGame,
  canSubmitGuess,
  createSession,
  handleNextQuestionOrRotate
};