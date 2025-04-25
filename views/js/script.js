document.addEventListener('DOMContentLoaded', () => {
  // Show loading screen immediately
  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.querySelector('.progress-bar');

  // Start progress animation
  let width = 0;
  const progressInterval = setInterval(() => {
    width += 12.5; //time to fill the bar
    progressBar.style.width = width + '%';
    if (width >= 100) clearInterval(progressInterval);
  }, 1000); // 1 second for each 12.5%

  // Hide loading screen after 8 seconds
  setTimeout(() => {
    loadingScreen.classList.remove('active');
    document.getElementById('welcome-screen').classList.add('active');
  }, 8000); // 8 seconds for loading screen

  // Connect to socket.io server
  const socket = io();

  // DOM Elements
  // Screens
  const welcomeScreen = document.getElementById('welcome-screen');
  const lobbyScreen = document.getElementById('lobby-screen');
  const gameScreen = document.getElementById('game-screen');
  const resultScreen = document.getElementById('result-screen');
  
  // Game sidebar
  const gameSidebar = document.querySelector('.game-sidebar');
  const sidebarIcons = document.querySelectorAll('.sidebar-icon-container');
  const closeSectionBtns = document.querySelectorAll('.close-section');
  
  // Welcome screen elements
  const usernameInput = document.getElementById('username-input');
  const sessionIdInput = document.getElementById('session-id-input');
  const createGameBtn = document.getElementById('create-game-btn');
  const joinGameBtn = document.getElementById('join-game-btn');
  
  // waiting room screen elements
  const sessionCodeDisplay = document.getElementById('session-code-display');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const playerCount = document.getElementById('player-count');
  const playersList = document.getElementById('players-list');
  const gameMasterControls = document.getElementById('game-master-controls');
  const waitingMessage = document.getElementById('waiting-message');
  const questionsContainer = document.getElementById('questions-container');
  const prevQuestionBtn = document.getElementById('prev-question-btn');
  const nextQuestionBtn = document.getElementById('next-question-btn');
  const addQuestionBtn = document.getElementById('add-question-btn');
  const questionCounter = document.getElementById('question-counter');
  const startGameBtn = document.getElementById('start-game-btn');
  
  // Chat elements
  const lobbyChatMessages = document.getElementById('lobby-chat-messages');
  const lobbyChatInput = document.getElementById('lobby-chat-input');
  const lobbyChatSend = document.getElementById('lobby-chat-send');
  const resultChatMessages = document.getElementById('result-chat-messages');
  const resultChatInput = document.getElementById('result-chat-input');
  const resultChatSend = document.getElementById('result-chat-send');
  const gameChatInput = document.getElementById('game-chat-input');
  const gameChatSend = document.getElementById('game-chat-send');
  
  // Game screen elements
  const timerDisplay = document.getElementById('timer-display');
  const questionDisplay = document.getElementById('question-display');
  const gameMasterWait = document.getElementById('game-master-wait');
  const playerGuessSection = document.getElementById('player-guess-section');
  const gameMessages = document.getElementById('game-messages');
  const attemptsLeft = document.getElementById('attempts-left');
  const guessInput = document.getElementById('guess-input');
  const submitGuessBtn = document.getElementById('submit-guess-btn');
  const activityLog = document.getElementById('activity-log');
  // const playerScores = document.getElementById('player-scores');
  
  // Result screen elements
  const winMessage = document.getElementById('win-message');
  const winnerMessage = document.getElementById('winner-message');
  const winnerDisplay = document.getElementById('winner-display');
  const answerDisplay = document.getElementById('answer-display');
  const timeoutMessage = document.getElementById('timeout-message');
  const timeoutAnswerDisplay = document.getElementById('timeout-answer-display');
  const finalScores = document.getElementById('final-scores');
  const newGameMaster = document.getElementById('new-game-master');
  const nextRoundBtn = document.getElementById('next-round-btn');
  
  // Notification
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  const notificationClose = document.getElementById('notification-close');
  
  // App State
  const state = {
    username: '',
    sessionId: '',
    isGameMaster: false,
    players: [],
    scores: {},
    timerInterval: null,
    questions: [],
    currentQuestionIndex: 0,
    activityHistory: [], // Store activity log history
    activeSidebarSection: null, // Track active sidebar section
    isSidebarCollapsed: false // Track sidebar state
  };

  // Handle sidebar icon clicks
  sidebarIcons.forEach(iconContainer => {
    iconContainer.addEventListener('click', () => {
      const sectionId = iconContainer.dataset.section;
      const section = document.getElementById(sectionId);
      
      // Hide all sections first
      document.querySelectorAll('.sidebar-section').forEach(s => {
        s.classList.add('hidden');
      });
      
      // If clicking the same section that's already active, collapse sidebar
      if (state.activeSidebarSection === sectionId) {
        gameSidebar.classList.remove('expanded');
        state.activeSidebarSection = null;
      } else {
        // Show the clicked section and expand sidebar
        section.classList.remove('hidden');
        gameSidebar.classList.add('expanded');
        state.activeSidebarSection = sectionId;
      }
    });
  });

  // Handle close section buttons
  closeSectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Close the section and collapse sidebar
      btn.closest('.sidebar-section').classList.add('hidden');
      gameSidebar.classList.remove('expanded');
      state.activeSidebarSection = null;
    });
  });
  
  // Show notification function
  function showNotification(message) {
    console.log('Showing notification:', message);
    notificationMessage.textContent = message;
    notification.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  
  // Close notification
  notificationClose.addEventListener('click', () => {
    notification.classList.remove('show');
  });
  
  // Show screen - fixes transitions between screens
  function showScreen(screen) {
    welcomeScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    
    screen.classList.add('active');
    console.log('Showing screen:', screen.id);
  }
  
  // Add activity message with improved display
  function addActivityMessage(message, timestamp) {
    // Store in history
    state.activityHistory.push({ message, timestamp });
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    // Add timestamp if provided
    if (timestamp) {
      activityItem.textContent = `[${timestamp}] ${message}`;
    } else {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      activityItem.textContent = `[${timeString}] ${message}`;
    }
    
    activityLog.appendChild(activityItem);
    activityLog.scrollTop = activityLog.scrollHeight;
    
    // If there's a new activity, add a notification indicator
    const activityIcon = document.querySelector('[data-section="activity-section"] .sidebar-icon');
    if (activityIcon) {
      activityIcon.classList.add('notification-dot');
      
      // Remove notification dot when section is opened
      setTimeout(() => {
        activityIcon.classList.remove('notification-dot');
      }, 3000);
    }
  }
  
  // Add chat message
  function addChatMessage(data, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (data.isSystem) {
      messageDiv.classList.add('system-message');
      messageDiv.innerHTML = `
        <div class="system-content">${data.content}</div>
        <div class="message-timestamp">${data.timestamp || new Date().toLocaleTimeString()}</div>
      `;
    } else {
      // Regular message
      const isCurrentUser = data.username === state.username;
      messageDiv.classList.add(isCurrentUser ? 'my-message' : 'other-message');
      
      if (data.isGuess) {
        messageDiv.classList.add('guess-message');
      }
      
      messageDiv.innerHTML = `
        <div class="message-header">
          <span class="message-username">${data.username}</span>
          <span class="message-timestamp">${data.timestamp || new Date().toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${data.content}</div>
      `;
    }
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }
  
  // Add game message - used for game-specific messages
  function addGameMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `game-message ${type || 'system'}`;
    messageDiv.textContent = message;
    gameMessages.appendChild(messageDiv);
    gameMessages.scrollTop = gameMessages.scrollHeight;
  }
  
  // Update player list
  function updatePlayerList(players) {
    playersList.innerHTML = '';
    playerCount.textContent = `(${players.length})`;
    
    players.forEach(player => {
      const playerItem = document.createElement('li');
      playerItem.className = 'player-item';
      
      const playerName = document.createElement('div');
      playerName.className = 'player-name';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = player.username;
      
      playerName.appendChild(nameSpan);
      
      if (player.isGameMaster) {
        const gameMasterBadge = document.createElement('span');
        gameMasterBadge.className = 'game-master-badge';
        gameMasterBadge.textContent = 'Game Master';
        playerName.appendChild(gameMasterBadge);
      }
      
      const playerScore = document.createElement('div');
      playerScore.className = 'player-score';
      playerScore.textContent = `${player.score || 0} pts`;
      
      playerItem.appendChild(playerName);
      playerItem.appendChild(playerScore);
      playersList.appendChild(playerItem);
    });
    
    // Update start game button state
    updateStartGameButton();
  }
  
  // Check if there are valid questions
  function hasValidQuestions() {
    const questionSets = document.querySelectorAll('.question-set');
    let valid = false;
    
    questionSets.forEach(set => {
      const questionInput = set.querySelector('.question-input');
      const answerInput = set.querySelector('.answer-input');
      
      if (questionInput && answerInput && 
          questionInput.value.trim() && answerInput.value.trim()) {
        valid = true;
      }
    });
    
    return valid;
  }
  
  // Update scores display with improved layout
  function updateScoresDisplay(scores, container) {
    container.innerHTML = '';
    
    // Sort players by score (highest first)
    const sortedPlayers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    
    sortedPlayers.forEach((username, index) => {
      const scoreItem = document.createElement('div');
      scoreItem.className = 'score-item';
      
      // Add rank indicator
      const rankDiv = document.createElement('div');
      rankDiv.className = 'score-rank';
      rankDiv.textContent = `#${index + 1}`;
      
      const usernameDiv = document.createElement('div');
      usernameDiv.className = 'score-username';
      usernameDiv.textContent = username;
      
      const pointsDiv = document.createElement('div');
      pointsDiv.className = 'score-points';
      pointsDiv.textContent = `${scores[username]} pts`;
      
      scoreItem.appendChild(rankDiv);
      scoreItem.appendChild(usernameDiv);
      scoreItem.appendChild(pointsDiv);
      container.appendChild(scoreItem);
    });
    
    // If scores update, add a notification indicator
    const scoresIcon = document.querySelector('[data-section="scores-section"] .sidebar-icon');
    if (scoresIcon) {
      scoresIcon.classList.add('notification-dot');
      
      // Remove notification dot after a few seconds
      setTimeout(() => {
        scoresIcon.classList.remove('notification-dot');
      }, 3000);
    }
  }
  
  // Format timer
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Reset game state function
  function resetGameState() {
    // Clear all game messages
    gameMessages.innerHTML = '';
    activityLog.innerHTML = '';
    
    // Reset UI elements
    winMessage.style.display = 'none';
    timeoutMessage.style.display = 'none';
    
    // Reset attempts
    if (attemptsLeft) {
      attemptsLeft.textContent = '3';
    }
    
    // Enable inputs
    guessInput.disabled = false;
    submitGuessBtn.disabled = false;
  }
  
  // Toggle sidebar
  const toggleSidebar = document.getElementById('toggle-sidebar');
  if (toggleSidebar) {
    toggleSidebar.addEventListener('click', () => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
      
      if (state.isSidebarCollapsed) {
        sidebarContent.style.display = 'none';
        toggleSidebar.querySelector('i').className = 'fas fa-chevron-right';
        document.querySelector('.game-sidebar').classList.add('collapsed');
      } else {
        sidebarContent.style.display = 'block';
        toggleSidebar.querySelector('i').className = 'fas fa-chevron-left';
        document.querySelector('.game-sidebar').classList.remove('collapsed');
      }
    });
  }
  
  // Toggle sidebar sections
  const toggleSectionBtns = document.querySelectorAll('.toggle-section');
  toggleSectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.sidebar-section');
      const content = section.querySelector('.section-content');
      const icon = btn.querySelector('i');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
      } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-right';
      }
    });
  });
  
  // Add new question set
  function addQuestionSet() {
    const questionSets = document.querySelectorAll('.question-set');
    const newIndex = questionSets.length;
    
    // Create new question set element
    const newQuestionSet = document.createElement('div');
    newQuestionSet.className = 'question-set';
    newQuestionSet.dataset.index = newIndex;
    
    newQuestionSet.innerHTML = `
      <div class="form-group">
        <input type="text" class="question-input" placeholder="Enter your question" maxlength="100">
      </div>
      <div class="form-group">
        <input type="text" class="answer-input" placeholder="Enter the answer" maxlength="50">
      </div>
    `;
    
    questionsContainer.appendChild(newQuestionSet);
    
    // Add event listeners to new inputs to check validity for start button status
    const inputs = newQuestionSet.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', function() {
        updateStartGameButton();
      });
    });
    
    updateQuestionCounter();
    
    return newIndex;
  }
  
  // Update start game button state based on questions and players
  function updateStartGameButton() {
    if (state.isGameMaster) {
      const hasValidQuestion = hasValidQuestions();
      const hasEnoughPlayers = state.players.length >= 2;
      
      startGameBtn.disabled = !hasValidQuestion || !hasEnoughPlayers;
      
      if (!hasEnoughPlayers) {
        startGameBtn.textContent = 'Start Game (Need 2+ Players)';
      } else if (!hasValidQuestion) {
        startGameBtn.textContent = 'Start Game (Need Valid Questions)';
      } else {
        startGameBtn.textContent = 'Start Game';
      }
    }
  }
  
  // Show question at index
  function showQuestionAtIndex(index) {
    const questionSets = document.querySelectorAll('.question-set');
    
    questionSets.forEach(set => {
      set.classList.remove('active');
    });
    
    if (questionSets[index]) {
      questionSets[index].classList.add('active');
      state.currentQuestionIndex = index;
      
      // Update navigation buttons
      prevQuestionBtn.disabled = index === 0;
      nextQuestionBtn.disabled = index === questionSets.length - 1;
      
      updateQuestionCounter();
    }
  }
  
  // Update question counter display
  function updateQuestionCounter() {
    const questionSets = document.querySelectorAll('.question-set');
    questionCounter.textContent = `Question ${state.currentQuestionIndex + 1} of ${questionSets.length}`;
  }
  
  // Get all questions data
  function getAllQuestionsData() {
    const questionSets = document.querySelectorAll('.question-set');
    const questions = [];
    
    questionSets.forEach(set => {
      const questionInput = set.querySelector('.question-input');
      const answerInput = set.querySelector('.answer-input');
      
      if (questionInput && answerInput && 
          questionInput.value.trim() && answerInput.value.trim()) {
        questions.push({
          question: questionInput.value.trim(),
          answer: answerInput.value.trim()
        });
      }
    });
    
    return questions;
  }
  
  // Get current question data
  function getCurrentQuestionData() {
    const currentSet = document.querySelector(`.question-set[data-index="${state.currentQuestionIndex}"]`);
    
    if (currentSet) {
      const questionInput = currentSet.querySelector('.question-input');
      const answerInput = currentSet.querySelector('.answer-input');
      
      if (questionInput && answerInput && 
          questionInput.value.trim() && answerInput.value.trim()) {
        return {
          question: questionInput.value.trim(),
          answer: answerInput.value.trim()
        };
      }
    }
    
    return null;
  }
  
  // Send chat message function
  function sendChatMessage(input, container) {
    const message = input.value.trim();
    
    if (!message) {
      return;
    }
    
    socket.emit('send_chat', {
      sessionId: state.sessionId,
      message: message
    });
    
    // Clear input
    input.value = '';
    input.focus();
  }
  
  // Chat event listeners
  lobbyChatSend.addEventListener('click', () => {
    sendChatMessage(lobbyChatInput, lobbyChatMessages);
  });
  
  lobbyChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(lobbyChatInput, lobbyChatMessages);
    }
  });
  
  resultChatSend.addEventListener('click', () => {
    sendChatMessage(resultChatInput, resultChatMessages);
  });
  
  resultChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(resultChatInput, resultChatMessages);
    }
  });
  
  gameChatSend.addEventListener('click', () => {
    sendChatMessage(gameChatInput, gameMessages);
  });
  
  gameChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(gameChatInput, gameMessages);
    }
  });
  
  // Handle session creation with debugging
  createGameBtn.addEventListener('click', () => {
    console.log('Create game button clicked');
    const username = usernameInput.value.trim();
    
    if (!username) {
      console.log('No username entered');
      showNotification('Please enter a username');
      return;
    }
    
    console.log('Emitting create_session event with username:', username);
    state.username = username;
    socket.emit('create_session', username);
  });
  
  // Handle joining a session with debugging
  joinGameBtn.addEventListener('click', () => {
    console.log('Join game button clicked');
    const username = usernameInput.value.trim();
    const sessionId = sessionIdInput.value.trim().toUpperCase();
    
    if (!username) {
      console.log('No username entered');
      showNotification('Please enter a username');
      return;
    }
    
    if (!sessionId) {
      console.log('No session ID entered');
      showNotification('Please enter a session code');
      return;
    }
    
    console.log('Emitting join_session event:', { sessionId, username });
    state.username = username;
    socket.emit('join_session', { sessionId, username });
  });
  
  // Copy session code to clipboard
  copyCodeBtn.addEventListener('click', () => {
    // Use the modern Clipboard API
    navigator.clipboard.writeText(state.sessionId)
      .then(() => {
        showNotification('Session code copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showNotification('Failed to copy session code');
      });
  });
  
  // Handle question navigation
  prevQuestionBtn.addEventListener('click', () => {
    if (state.currentQuestionIndex > 0) {
      showQuestionAtIndex(state.currentQuestionIndex - 1);
    }
  });
  
  nextQuestionBtn.addEventListener('click', () => {
    const questionSets = document.querySelectorAll('.question-set');
    if (state.currentQuestionIndex < questionSets.length - 1) {
      showQuestionAtIndex(state.currentQuestionIndex + 1);
    }
  });
  
  // Add question button click handler
  addQuestionBtn.addEventListener('click', () => {
    const newIndex = addQuestionSet();
    showQuestionAtIndex(newIndex);
  });
  
  // Start game button click handler
  startGameBtn.addEventListener('click', () => {
    const currentQuestion = getCurrentQuestionData();
    
    if (!currentQuestion) {
      showNotification('Please enter a valid question and answer');
      return;
    }
    
    socket.emit('start_game', {
      sessionId: state.sessionId,
      question: currentQuestion.question,
      answer: currentQuestion.answer
    });
  });
  
  // Submit guess button click handler
  submitGuessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim();
    
    if (!guess) {
      showNotification('Please enter a guess');
      return;
    }
    
    socket.emit('submit_guess', {
      sessionId: state.sessionId,
      guess: guess
    });
    
    // Clear input
    guessInput.value = '';
    guessInput.focus();
  });
  
  // Enter key for guess submission
  guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitGuessBtn.click();
    }
  });
  
  // Next round button click handler
  nextRoundBtn.addEventListener('click', () => {
    socket.emit('ready_for_next_round', {
      sessionId: state.sessionId
    });
    
    showScreen(lobbyScreen);
    
    // Use the resetGameState function to ensure all UI elements are reset
    resetGameState();
    
    // Show appropriate controls based on game master status
    if (state.isGameMaster) {
      gameMasterControls.style.display = 'block';
      waitingMessage.style.display = 'none';
    } else {
      gameMasterControls.style.display = 'none';
      waitingMessage.style.display = 'block';
    }
  });
  
  // Add event listeners to initial question inputs
  const initialInputs = document.querySelectorAll('.question-set input');
  initialInputs.forEach(input => {
    input.addEventListener('input', updateStartGameButton);
  });
  
  // Socket.io event handlers with improved logging
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    showNotification('Failed to connect to server. Please check your connection.');
  });
  
  socket.on('error', (message) => {
    console.error('Server error:', message);
    showNotification(message);
  });
  
  socket.on('session_created', (data) => {
    console.log('Session created:', data);
    state.sessionId = data.sessionId;
    state.isGameMaster = data.isGameMaster;
    state.players = data.players;
    
    // Set up UI for lobby
    sessionCodeDisplay.textContent = data.sessionId;
    
    // Show game master controls and hide waiting message
    gameMasterControls.style.display = 'block';
    waitingMessage.style.display = 'none';
    
    // Update player list
    updatePlayerList(data.players);
    
    // Show lobby screen
    showScreen(lobbyScreen);
    
    // Add activity message
    addActivityMessage('You created a new game session');
    
    // Add system chat message
    addChatMessage({
      isSystem: true,
      content: 'Welcome to the game! Share the session code with friends to play together.',
      timestamp: new Date().toLocaleTimeString()
    }, lobbyChatMessages);
  });
  
  socket.on('session_joined', (data) => {
    console.log('Session joined:', data);
    state.sessionId = data.sessionId;
    state.isGameMaster = data.isGameMaster;
    state.players = data.players;
    
    // Set up UI for lobby
    sessionCodeDisplay.textContent = data.sessionId;
    
    // Hide game master controls and show waiting message for regular players
    if (state.isGameMaster) {
      gameMasterControls.style.display = 'block';
      waitingMessage.style.display = 'none';
    } else {
      gameMasterControls.style.display = 'none';
      waitingMessage.style.display = 'block';
    }
    
    // Update player list
    updatePlayerList(data.players);
    
    // Show lobby screen
    showScreen(lobbyScreen);
    
    // Add activity message
    addActivityMessage('You joined the game session');
    
    // Add system chat message
    addChatMessage({
      isSystem: true,
      content: 'Welcome to the game! Wait for the game master to start the game.',
      timestamp: new Date().toLocaleTimeString()
    }, lobbyChatMessages);
  });
  
  socket.on('player_joined', (data) => {
    console.log('Player joined:', data);
    state.players = data.players;
    
    // Update player list
    updatePlayerList(data.players);
    
    // Add activity message if not the current user
    if (data.username !== state.username) {
      addActivityMessage(`${data.username} joined the session`);
    }
  });
  
  socket.on('player_left', (data) => {
    console.log('Player left:', data);
    state.players = data.players;
    
    // Update player list
    updatePlayerList(data.players);
    
    // Add activity message
    addActivityMessage(`${data.username} left the session`);
  });
  
  socket.on('chat_message', (data) => {
    console.log('Chat message received:', data);
    // Add to appropriate chat container
    const currentScreen = document.querySelector('.screen.active').id;
    let container;
    
    if (currentScreen === 'lobby-screen') {
      container = lobbyChatMessages;
    } else if (currentScreen === 'game-screen') {
      container = gameMessages;
    } else if (currentScreen === 'result-screen') {
      container = resultChatMessages;
    }
    
    if (container) {
      addChatMessage(data, container);
    }
    
    // If this is a guess, also display in game messages if we're in game screen
    if (data.isGuess && currentScreen === 'game-screen') {
      const isCurrentUser = data.username === state.username;
      addGameMessage(data.content, isCurrentUser ? 'my-guess' : 'other-player');
    }
  });
  
  socket.on('activity_log', (data) => {
    console.log('Activity log:', data);
    addActivityMessage(data.message, data.timestamp);
  });
  
  socket.on('game_started', (data) => {
    console.log('Game started:', data);
    
    // Reset game state
    resetGameState();
    
    // Display question
    questionDisplay.textContent = data.question;
    
    // Set up UI based on role
    if (state.isGameMaster) {
      gameMasterWait.style.display = 'block';
      playerGuessSection.style.display = 'none';
    } else {
      gameMasterWait.style.display = 'none';
      playerGuessSection.style.display = 'block';
      attemptsLeft.textContent = '3'; // Reset attempts
    }
    
    // Show game screen
    showScreen(gameScreen);
    
    // Initialize timer display
    timerDisplay.textContent = formatTime(data.timeRemaining);
    
    // Add activity message
    addActivityMessage('Game started');
  });
  
  socket.on('time_update', (data) => {
    // Update timer display
    timerDisplay.textContent = formatTime(data.timeRemaining);
  });
  
  socket.on('guess_result', (data) => {
    console.log('Guess result:', data);
    if (!data.correct) {
      // Update attempts left
      attemptsLeft.textContent = data.attemptsLeft;
      
      // Add game message
      addGameMessage('Incorrect guess!', 'system');
    }
  });
  
  socket.on('no_attempts_left', () => {
    console.log('No attempts left');
    // Disable guess input
    guessInput.disabled = true;
    submitGuessBtn.disabled = true;
 
     // Add game message
   addGameMessage('You have no attempts left. Wait for the next round.', 'system');
  });
  
  socket.on('you_won', () => {
    // Display win message in result screen
    winMessage.style.display = 'block';
  });
  
  socket.on('game_ended', (data) => {
    // Set up result screen
    if (data.winner) {
      winnerDisplay.textContent = `${data.winner} guessed the correct answer!`;
      answerDisplay.textContent = data.answer;
      winnerMessage.style.display = 'block';
      timeoutMessage.style.display = 'none';
    } else {
      timeoutAnswerDisplay.textContent = data.answer;
      timeoutMessage.style.display = 'block';
      winnerMessage.style.display = 'none';
    }
    
    // Update scores
    updateScoresDisplay(data.scores, finalScores);
    
    // Enable controls
    guessInput.disabled = false;
    submitGuessBtn.disabled = false;
    
    // Show result screen
    showScreen(resultScreen);
    
    // Add activity message
    addActivityMessage(`Game ended - ${data.winner ? `${data.winner} won!` : 'Time\'s up!'}`);
  });
  
  socket.on('game_master_changed', (data) => {
    if (data && data.gameMasterId && data.gameMasterName) {
      // Update game master display
      newGameMaster.textContent = data.gameMasterName;
      
      // Update game master status for current user
      state.isGameMaster = socket.id === data.gameMasterId;
      
      // Update player list to reflect new game master
      const updatedPlayers = state.players.map(player => {
        return {
          ...player,
          isGameMaster: player.socketId === data.gameMasterId
        };
      });
      
      state.players = updatedPlayers;
      updatePlayerList(updatedPlayers);
      
      // Add activity message
      addActivityMessage(`${data.gameMasterName} is now the game master`);
    }
  });
  
  socket.on('refresh_lobby', (data) => {
    state.players = data.players;
    state.isGameMaster = data.isGameMaster;
    
    // Update player list
    updatePlayerList(data.players);
    
    // Show appropriate controls based on game master status
    if (state.isGameMaster) {
      gameMasterControls.style.display = 'block';
      waitingMessage.style.display = 'none';
    } else {
      gameMasterControls.style.display = 'none';
      waitingMessage.style.display = 'block';
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showNotification('Disconnected from server. Please refresh the page.');
  });
 });