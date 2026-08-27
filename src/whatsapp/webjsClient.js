const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const conversationEngine = require('../chat/conversationEngine');
const config = require('../config/env');
const { findChrome } = require('./chromeFinder');
const { setStatus, getStatus } = require('./status');

let client = null;

function startWebJsClient() {
  setStatus({ provider: 'webjs', status: 'starting', qr: null, lastError: null });

  const { path: chromePath, source } = findChrome(config.wa.chromePath);
  setStatus({ chromePath: chromePath || null });

  if (chromePath) {
    console.log(`🧭 Using Chrome for WhatsApp Web (${source}): ${chromePath}`);
  } else {
    console.warn(
      '⚠️  No system Chrome/Edge found and puppeteer has no bundled browser.\n' +
        '   WhatsApp will stay unavailable. Fix it by either:\n' +
        '     • installing Google Chrome, then restarting, or\n' +
        '     • setting PUPPETEER_EXECUTABLE_PATH in backend/.env to a chrome.exe / msedge.exe path, or\n' +
        '     • running:  npx puppeteer browsers install chrome'
    );
  }

  const puppeteerOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };
  if (chromePath) puppeteerOpts.executablePath = chromePath;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: config.wa.authPath }),
    puppeteer: puppeteerOpts,
  });

  client.on('qr', (qr) => {
    setStatus({ status: 'qr', qr });
    console.log('\n📱 Scan this QR code with WhatsApp (Linked Devices > Link a Device):\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ WhatsApp loading: ${percent}% ${message || ''}`.trim());
  });

  client.on('authenticated', () => {
    setStatus({ status: 'authenticated', qr: null });
    console.log('🔐 WhatsApp authenticated.');
  });

  client.on('ready', () => {
    setStatus({ status: 'ready', qr: null, lastError: null });
    console.log('✅ WhatsApp client is ready and listening for messages.');
  });

  client.on('auth_failure', (msg) => {
    setStatus({ status: 'auth_failure', lastError: String(msg) });
    console.error('❌ WhatsApp auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    setStatus({ status: 'disconnected', lastError: String(reason) });
    console.warn('⚠️  WhatsApp disconnected:', reason);
  });

  client.on('message', async (msg) => {
    try {
      // msg.from looks like "9231XXXXXXXX@c.us"
      const userId = msg.from;
      const contact = msg.from.replace('@c.us', '');
      const { reply } = await conversationEngine.handleMessage(userId, msg.body, contact, 'whatsapp');
      await msg.reply(reply);
    } catch (err) {
      console.error('Error handling WhatsApp message:', err);
      try {
        await msg.reply('Sorry, something went wrong. Please try again in a moment.');
      } catch (_) {}
    }
  });

  // initialize() can reject (bad Chrome, no network, corrupt session).
  // Swallow it here so a WhatsApp problem can never take down the API server.
  client.initialize().catch((err) => {
    const message = (err && err.message) || String(err);
    setStatus({ status: 'unavailable', lastError: message });
    console.error('❌ WhatsApp client could not start:', message);
    console.error(
      '   The booking API and web chatbot keep working; only WhatsApp messaging is offline.'
    );
  });

  return client;
}

async function stopWebJsClient() {
  if (!client) return;
  try {
    await client.destroy();
  } catch (_) {
    /* ignore */
  }
  client = null;
}

module.exports = { startWebJsClient, stopWebJsClient, getStatus };
