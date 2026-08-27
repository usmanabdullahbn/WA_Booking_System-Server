// Shared, in-memory status for the WhatsApp subsystem.
// Kept in its own module so routes and providers can read/write it
// without creating circular requires.

const state = {
  provider: null, // "webjs" | "cloud"
  status: 'disabled', // disabled | starting | qr | authenticated | ready | auth_failure | disconnected | unavailable
  qr: null, // last QR string (webjs only), cleared once linked
  chromePath: null, // resolved Chrome/Edge executable used by puppeteer
  lastError: null, // human-readable last error, if any
  updatedAt: new Date().toISOString(),
};

function setStatus(patch) {
  Object.assign(state, patch, { updatedAt: new Date().toISOString() });
  return state;
}

function getStatus() {
  return { ...state };
}

module.exports = { setStatus, getStatus };
