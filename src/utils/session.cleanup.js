const handleSessionCleanup = (sessions, socketId) => {
const affectedSessions = {};


Object.entries(sessions).forEach(([sessionId, session]) => {
  if (session.players[socketId]) {
    const wasGameMaster = socketId === session.gameMasterId;
    const username = session.players[socketId].username;
    
  session.removePlayer(socketId);
    
  if (session.getPlayersCount() === 0) {
   affectedSessions[sessionId] = {
        action: 'delete',
      };
  } else {
    affectedSessions[sessionId] = {
      action: 'update',
      wasGameMaster,
      username,
      players: session.getPlayers(),
      session
    };
    
    if (wasGameMaster) {
      session.assignNewGameMaster();
      
    if (session.gameStarted) {
      session.stopTimer();
      session.endGame();
      
      affectedSessions[sessionId].gameWasEnded = true;

      affectedSessions[sessionId].answer = session.answer;

      affectedSessions[sessionId].scores = session.getScores();
    }
    
    affectedSessions[sessionId].newGameMaster = {

      gameMasterId: session.gameMasterId,
      
      gameMasterName: session.players[session.gameMasterId].username
    };
  }
}
}
});

Object.entries(affectedSessions).forEach(([sessionId, info]) => {
  if (info.action === 'delete') {
    delete sessions[sessionId];
    console.log(`Session ${sessionId} deleted - no players left`);
  }
});

return affectedSessions;
};

module.exports = handleSessionCleanup;