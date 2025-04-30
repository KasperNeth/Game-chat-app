const createPlayer = (username, score = 0, attempts = 3) => ({
  username,
  score,
  attempts
});

const usernameExists = (players, username) => 
  Object.values(players).some(player => player.username === username);

const formatPlayerForList = (playerId, player, gameMasterId) => ({
  id: playerId,
  username: player.username,
  score: player.score,
  isGameMaster: playerId === gameMasterId
});

// Main session functions
const getPlayers = (players, gameMasterId) => 
  Object.entries(players).map(([playerId, player]) => 
    formatPlayerForList(playerId, player, gameMasterId));

const getPlayersCount = (players) => Object.keys(players).length;

const getScores = (players) => 
  Object.entries(players).reduce((scores, [_, player]) => {
    scores[player.username] = player.score;
    return scores;
  }, {});

const addPlayer = (players, playerId, username) => {
  if (usernameExists(players, username)) {
    return { success: false, players };
  }
  
  return { 
    success: true, 
    players: { 
      ...players, 
      [playerId]: createPlayer(username) 
    }
  };
};

const removePlayer = (players, playerId) => {
  if (!players[playerId]) {
    return { success: false, players };
  }
  
  const updatedPlayers = { ...players };
  delete updatedPlayers[playerId];
  
  return { success: true, players: updatedPlayers };
};

const resetAttempts = (players, gameMasterId) => 
  Object.entries(players).reduce((updatedPlayers, [playerId, player]) => {
    updatedPlayers[playerId] = playerId !== gameMasterId 
      ? { ...player, attempts: 3 }
      : player;
    return updatedPlayers;
  }, {});

const startGame = (question, answer, players, gameMasterId, timeLimit) => ({
  gameStarted: true,
  hasWinner: false,
  question,
  answer,
  timeRemaining: timeLimit,
  players: resetAttempts(players, gameMasterId)
});

const endGame = () => ({
  gameStarted: false,
  hasWinner: false,
  question: "",
  answer: "",
  timer: null
});

const submitGuess = (sessionState, playerId, guess) => {
  const { gameStarted, hasWinner, answer, players } = sessionState;
  
  if (!gameStarted || hasWinner || !players[playerId] || players[playerId].attempts <= 0) {
    return { 
      sessionState,
      result: { correct: false, attemptsLeft: players[playerId]?.attempts || 0 } 
    };
  }
  
  const updatedPlayers = { ...players };
  updatedPlayers[playerId] = { 
    ...players[playerId], 
    attempts: players[playerId].attempts - 1 
  };
  
  const isCorrect = guess.trim().toLowerCase() === answer.trim().toLowerCase();
  
  if (isCorrect) {
    updatedPlayers[playerId].score += 10;
    
    return { 
      sessionState: { 
        ...sessionState, 
        players: updatedPlayers,
        hasWinner: true,
        gameStarted: false
      },
      result: { correct: true, attemptsLeft: updatedPlayers[playerId].attempts }
    };
  }
  
  return { 
    sessionState: { ...sessionState, players: updatedPlayers },
    result: { correct: false, attemptsLeft: updatedPlayers[playerId].attempts }
  };
};

const rotateGameMaster = (players, gameMasterId) => {
  const playerIds = Object.keys(players);
  if (playerIds.length <= 1) return gameMasterId;
  
  const currentIndex = playerIds.indexOf(gameMasterId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  
  return playerIds[nextIndex];
};

const assignNewGameMaster = (players) => {
  const playerIds = Object.keys(players);
  return playerIds.length > 0 ? playerIds[0] : null;
};

const createTimer = (timeLimit, onTick, onComplete) => {
  let timeRemaining = timeLimit;
  
  const timerId = setInterval(() => {
    timeRemaining--;
    
    if (onTick) {
      onTick(timeRemaining);
    }
    
    if (timeRemaining <= 0) {
      clearInterval(timerId);
      
      if (onComplete) {
        onComplete();
      }
    }
  }, 1000);
  
  return {
    timerId,
    stop: () => clearInterval(timerId)
  };
};
const setQuestions = (questions, currentState = {}) => {
  return {
    ...currentState,
    questions: questions,
    currentQuestionIndex: 0
  };
};

const getCurrentQuestion = (questions, currentQuestionIndex) => {
  if (questions.length > 0) {
    return questions[currentQuestionIndex];
  }
  return null;
};

const moveToNextQuestion = (questions, currentQuestionIndex) => {
  if (currentQuestionIndex < questions.length - 1) {
    return {
      success: true,
      newIndex: currentQuestionIndex + 1
    };
  }
  return {
    success: false,
    newIndex: currentQuestionIndex
  };
};
// Main GameSession class
class GameSession {
  constructor(sessionId, gameMasterId, gameMasterName) {
    this.sessionId = sessionId;
    this.gameMasterId = gameMasterId;
    this.players = {
      [gameMasterId]: createPlayer(gameMasterName)
    };
    this.gameStarted = false;
    this.hasWinner = false;
    this.question = "";
    this.answer = "";
    this.timeLimit = 60; // Time limit in seconds
    this.timeRemaining = this.timeLimit;
    this.timer = null;
    this.questions =[];
    this.currentQuestionIndex= 0;
  }
  setQuestions = (questions) => {
    const result = setQuestions(questions);
    this.questions = result.questions;
    this.currentQuestionIndex = result.currentQuestionIndex;
  }
  
  getCurrentQuestion = () => {
    return getCurrentQuestion(this.questions, this.currentQuestionIndex);
  }
  
  moveToNextQuestion = () => {
    const result = moveToNextQuestion(this.questions, this.currentQuestionIndex);
    if (result.success) {
      this.currentQuestionIndex = result.newIndex;
    }
    return result.success;
  }

  getPlayers = () => getPlayers(this.players, this.gameMasterId);

  getPlayersCount = () => getPlayersCount(this.players);

  getScores = () => getScores(this.players);

  addPlayer = (playerId, username) => {
    const result = addPlayer(this.players, playerId, username);
    this.players = result.players;
    return result.success;
  };

  removePlayer = (playerId) => {
    const result = removePlayer(this.players, playerId);
    this.players = result.players;
    return result.success;
  };

  startGame = (question, answer) => {
    const gameState = startGame(question, answer, this.players, this.gameMasterId, this.timeLimit);
    this.gameStarted = gameState.gameStarted;
    this.hasWinner = gameState.hasWinner;
    this.question = gameState.question;
    this.answer = gameState.answer;
    this.timeRemaining = gameState.timeRemaining;
    this.players = gameState.players;
  };

  endGame = () => {
    const gameState = endGame();
    this.gameStarted = gameState.gameStarted;
    this.hasWinner = gameState.hasWinner;
    this.question = gameState.question;
    this.answer = gameState.answer;
    this.stopTimer();
  };

  startTimer = (onTick, onComplete) => {
    this.timeRemaining = this.timeLimit;
    
    const timerObj = createTimer(
      this.timeLimit,
      (remaining) => {
        this.timeRemaining = remaining;
        if (onTick) onTick();
      },
      () => {
        this.gameStarted = false;
        this.timer = null;
        if (onComplete) onComplete();
      }
    );
    
    this.timer = timerObj;
  };

  stopTimer = () => {
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
  };

  submitGuess = (playerId, guess) => {
    const sessionState = {
      gameStarted: this.gameStarted,
      hasWinner: this.hasWinner,
      question: this.question,
      answer: this.answer,
      players: this.players
    };
    
    const { sessionState: updatedState, result } = submitGuess(sessionState, playerId, guess);
    
    this.gameStarted = updatedState.gameStarted;
    this.hasWinner = updatedState.hasWinner;
    this.players = updatedState.players;
    
    return result;
  };

  rotateGameMaster = () => {
    this.gameMasterId = rotateGameMaster(this.players, this.gameMasterId);
  };

  assignNewGameMaster = () => {
    this.gameMasterId = assignNewGameMaster(this.players);
  };
}

module.exports = GameSession;