const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { generateSessionCode, formatTimestamp } = require("./src/utils/session");
const {validateUsername,validateSessionId,validateGameInput} = require("./src/validations/input");
const {createSession,findSessionById,canJoinSession,canStartGame, canSubmitGuess} = require("./src/utils/session.helper");
const handleSessionCleanup = require("./src/utils/session.cleanup");

require("dotenv").config();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

// Sessions store
const sessions = {};

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create_session", (username) => {
    const { isValid, sanitizedUsername } = validateUsername(username);
    
    if (!isValid) {
      socket.emit("error", "Username cannot be empty");
      return;
    }
    
    const sessionId = generateSessionCode();
    sessions[sessionId] = createSession(sessionId, socket.id, sanitizedUsername);
    
    socket.join(sessionId);
    socket.emit("session_created", {
      sessionId,
      isGameMaster: true,
      players: sessions[sessionId].getPlayers()
    });
    
    console.log(`Session created: ${sessionId} by ${sanitizedUsername}`);
  });

  socket.on("join_session", ({ sessionId, username }) => {
    const usernameValidation = validateUsername(username);
    const sessionValidation = validateSessionId(sessionId);
    
    if (!usernameValidation.isValid) {
      socket.emit("error", "Username cannot be empty");
      return;
    }
    
    const session = findSessionById(sessions, sessionValidation.sanitizedSessionId);
    
    if (!session) {
      socket.emit("error", "Session not found");
      return;
    }
    
    if (!canJoinSession(session)) {
      socket.emit("error", "Game is already in progress");
      return;
    }
    
    const joinSuccess = session.addPlayer(socket.id, usernameValidation.sanitizedUsername);
    
    if (!joinSuccess) {
      socket.emit("error", "Username already exists in this session");
      return;
    }
    
    socket.join(sessionValidation.sanitizedSessionId);
    
    socket.emit("session_joined", {
      sessionId: sessionValidation.sanitizedSessionId,
      isGameMaster: false,
      players: session.getPlayers()
    });
    
    io.to(sessionValidation.sanitizedSessionId).emit("player_joined", {
      players: session.getPlayers(),
      username: usernameValidation.sanitizedUsername
    });
    
    // Send system message about new player joining
    io.to(sessionValidation.sanitizedSessionId).emit("chat_message", {
      isSystem: true,
      content: `${usernameValidation.sanitizedUsername} joined the session`,
      timestamp: formatTimestamp()
    });
    
    console.log(`User ${usernameValidation.sanitizedUsername} joined session ${sessionValidation.sanitizedSessionId}`);
  });

  // Handle chat messages
  socket.on("send_chat", ({ sessionId, message }) => {
    const session = findSessionById(sessions, sessionId);
    
    if (!session) {
      socket.emit("error", "Session not found");
      return;
    }
    
    const player = Object.values(session.players).find(p => p.socketId === socket.id);
    
    if (!player) {
      socket.emit("error", "You are not part of this session");
      return;
    }
    
    // Validate message
    if (!message || message.trim() === '') {
      socket.emit("error", "Cannot send empty message");
      return;
    }
    
    const sanitizedMessage = message.trim().substring(0, 300); // Limit message length
    
    // Send the message to all session members
    io.to(sessionId).emit("chat_message", {
      username: player.username,
      content: sanitizedMessage,
      timestamp: formatTimestamp(),
      isSystem: false
    });
    
    // Log the activity
    io.to(sessionId).emit("activity_log", {
      message: `${player.username} sent a message`,
      timestamp: formatTimestamp()
    });
  });

  socket.on("start_game", ({ sessionId, question, answer }) => {
    const session = findSessionById(sessions, sessionId);
    
    if (!canStartGame(session, socket.id, session?.getPlayersCount())) {
      const errorMsg = !session ? "Session not found" : socket.id !== session.gameMasterId ? "Only game master can start the game" :"At least 2 players are required to start the game";
                      
      socket.emit("error", errorMsg);
      return;
    }
    
    const gameInput = validateGameInput(question, answer);
    
    if (!gameInput.isValid) {
      socket.emit("error", "Question and answer cannot be empty");
      return;
    }
    
    session.startGame(gameInput.sanitizedQuestion, gameInput.sanitizedAnswer);
    
    io.to(sessionId).emit("game_started", {
      question: gameInput.sanitizedQuestion,
      timeRemaining: session.timeLimit
    });
    
    // Send system message about game starting
    io.to(sessionId).emit("chat_message", {
      isSystem: true,
      content: "Game has started! Try to guess the answer.",
      timestamp: formatTimestamp()
    });
    
    // Activity log
    io.to(sessionId).emit("activity_log", {
      message: "Game started",
      timestamp: formatTimestamp()
    });
    
    session.startTimer(
      () => {
        io.to(sessionId).emit("time_update", { 
          timeRemaining: session.timeRemaining 
        });
      }, 
      () => {
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
        
        // Activity log
        io.to(sessionId).emit("activity_log", {
          message: "Game ended - Time's up",
          timestamp: formatTimestamp()
        });
        
        session.rotateGameMaster();
        
        io.to(sessionId).emit("game_master_changed", {
          gameMasterId: session.gameMasterId,
          gameMasterName: session.players[session.gameMasterId].username
        });
      }
    );
  });

  socket.on("submit_guess", ({ sessionId, guess }) => {
    const session = findSessionById(sessions, sessionId);
    
    if (!canSubmitGuess(session, socket.id)) {
      const errorMsg = !session || !session.gameStarted ? "No active game session" :session.hasWinner ? "Game already has a winner" : socket.id === session.gameMasterId ? "Game master cannot submit a guess" :"Player not found in session";
                      
      socket.emit("error", errorMsg);
      return;
    }
    
    const { isValid, sanitizedUsername: sanitizedGuess } = validateUsername(guess);
    
    if (!isValid) {
      socket.emit("error", "Guess cannot be empty");
      return;
    }
    
    const player = session.players[socket.id];
    const result = session.submitGuess(socket.id, sanitizedGuess);
    
    // Send the guess as a chat message visible to everyone
    io.to(sessionId).emit("chat_message", {
      username: player.username,
      content: sanitizedGuess,
      timestamp: formatTimestamp(),
      isGuess: true,
      isSystem: false
    });
    
    // Activity log
    io.to(sessionId).emit("activity_log", {
      message: `${player.username} made a guess`,
      timestamp: formatTimestamp()
    });
    
    if (result.correct) {
      session.stopTimer();
      
      io.to(sessionId).emit("game_ended", {
        winner: player.username,
        answer: session.answer,
        scores: session.getScores()
      });
      
      // System message about correct guess
      io.to(sessionId).emit("chat_message", {
        isSystem: true,
        content: `${player.username} guessed correctly! The answer was: ${session.answer}`,
        timestamp: formatTimestamp()
      });
      
      // Activity log
      io.to(sessionId).emit("activity_log", {
        message: `Game ended - ${player.username} guessed correctly`,
        timestamp: formatTimestamp()
      });
      
      socket.emit("you_won");
      
      session.rotateGameMaster();
      
      io.to(sessionId).emit("game_master_changed", {
        gameMasterId: session.gameMasterId,
        gameMasterName: session.players[session.gameMasterId].username
      });
    } else {
      socket.emit("guess_result", {
        correct: false,
        attemptsLeft: result.attemptsLeft
      });
      
      if (result.attemptsLeft === 0) {
        socket.emit("no_attempts_left");
        
        // System message about no attempts left
        socket.to(sessionId).emit("chat_message", {
          isSystem: true,
          content: `${player.username} has used all their attempts`,
          timestamp: formatTimestamp()
        });
        
        // Activity log
        io.to(sessionId).emit("activity_log", {
          message: `${player.username} has no attempts left`,
          timestamp: formatTimestamp()
        });
      }
    }
  });

  socket.on("ready_for_next_round", ({ sessionId }) => {
    const session = findSessionById(sessions, sessionId);
    
    if (!session) {
      socket.emit("error", "Session not found");
      return;
    }
    
    const player = Object.values(session.players).find(p => p.socketId === socket.id);
    
    if (player) {
      // System message about player ready for next round
      io.to(sessionId).emit("chat_message", {
        isSystem: true,
        content: `${player.username} is ready for the next round`,
        timestamp: formatTimestamp()
      });
      
      // Activity log
      io.to(sessionId).emit("activity_log", {
        message: `${player.username} ready for next round`,
        timestamp: formatTimestamp()
      });
    }
    
    socket.emit("refresh_lobby", {
      players: session.getPlayers(),
      isGameMaster: socket.id === session.gameMasterId
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    const affectedSessions = handleSessionCleanup(sessions, socket.id);
    
  Object.entries(affectedSessions).forEach(([sessionId, info]) => {
    if (info.action === 'update') {
      io.to(sessionId).emit("player_left", {
        username: info.username,
        players: info.players
      });
      
      // System message about player leaving
      io.to(sessionId).emit("chat_message", {
        isSystem: true,
        content: `${info.username} left the session`,
        timestamp: formatTimestamp()
      });
      
      // Activity log
      io.to(sessionId).emit("activity_log", {
        message: `${info.username} left the session`,
        timestamp: formatTimestamp()
      });

    if (info.wasGameMaster) {
      if (info.gameWasEnded) {
        io.to(sessionId).emit("game_ended", {
          reason: "Game master left",
          winner: null,
          answer: info.answer,
          scores: info.scores
        });
        
        // System message about game ending because game master left
        io.to(sessionId).emit("chat_message", {
          isSystem: true,
          content: `Game ended - Game master left. The answer was: ${info.answer}`,
          timestamp: formatTimestamp()
        });
        
        // Activity log
        io.to(sessionId).emit("activity_log", {
          message: "Game ended - Game master left",
          timestamp: formatTimestamp()
        });
      }
        
        io.to(sessionId).emit("game_master_changed", info.newGameMaster);
        
        if (info.newGameMaster) {
          // System message about new game master
          io.to(sessionId).emit("chat_message", {
            isSystem: true,
            content: `${info.newGameMaster.gameMasterName} is now the game master`,
            timestamp: formatTimestamp()
          });
          
          // Activity log
          io.to(sessionId).emit("activity_log", {
            message: `${info.newGameMaster.gameMasterName} is now the game master`,
            timestamp: formatTimestamp()
          });
        }
      }
    }
  });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});