// Simple in-memory session store keyed by a userId
// (WhatsApp phone number, or a browser-generated session id for the web chatbot).
// Swap this for Redis/DB if you need multi-instance / persistence.

const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      state: 'IDLE',
      data: {},
      updatedAt: Date.now(),
    });
  }
  return sessions.get(userId);
}

function setSession(userId, session) {
  session.updatedAt = Date.now();
  sessions.set(userId, session);
}

function resetSession(userId) {
  sessions.set(userId, { state: 'IDLE', data: {}, updatedAt: Date.now() });
}

module.exports = { getSession, setSession, resetSession };
