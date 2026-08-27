require('dotenv').config();

function list(str, fallback) {
  if (!str) return fallback;
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',

  waProvider: process.env.WA_PROVIDER || 'webjs',
  wa: {
    // Explicit Chrome/Edge executable for whatsapp-web.js (webjs provider).
    // PUPPETEER_EXECUTABLE_PATH is the puppeteer-standard name; WA_CHROME_PATH is an alias.
    chromePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.WA_CHROME_PATH || null,
    // Where the linked-device session is persisted.
    authPath: process.env.WA_AUTH_PATH || './.wwebjs_auth',
  },
  waCloud: {
    token: process.env.WA_CLOUD_TOKEN,
    phoneNumberId: process.env.WA_CLOUD_PHONE_NUMBER_ID,
    verifyToken: process.env.WA_CLOUD_VERIFY_TOKEN,
    apiVersion: process.env.WA_CLOUD_API_VERSION || 'v20.0',
  },

  google: {
    keyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account-key.json',
    sheetId: process.env.GOOGLE_SHEET_ID,
  },

  business: {
    name: process.env.BUSINESS_NAME || 'My Business',
    services: list(process.env.SERVICES, ['General Consultation']),
    workingHours: process.env.WORKING_HOURS || '09:00 - 18:00',
  },
};
