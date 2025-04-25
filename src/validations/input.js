const { sanitizeInput } = require("../utils/session");

const validateUsername = (username) => {
  const sanitizedUsername = sanitizeInput(username);
  return {
    isValid: !!sanitizedUsername,
    sanitizedUsername
  };
};

const validateSessionId = (sessionId) => {
  const sanitizedSessionId = sanitizeInput(sessionId);
  return {
    isValid: !!sanitizedSessionId && sanitizedSessionId.length === 10,
    sanitizedSessionId
  };
};
const validateGameInput = (question, answer) => {
  const sanitizedQuestion = sanitizeInput(question);
  const sanitizedAnswer = sanitizeInput(answer).toLowerCase();
  
  return {
    isValid: !!sanitizedQuestion && !!sanitizedAnswer,
    sanitizedQuestion,
    sanitizedAnswer
  };
};

module.exports = {
  validateUsername,
  validateSessionId,
  validateGameInput
};