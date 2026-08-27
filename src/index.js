const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiRoutes = require('./routes/api');
const { setStatus } = require('./whatsapp/status');

// --- Safety net -------------------------------------------------------------
// whatsapp-web.js / puppeteer can emit stray async errors (browser crashes,
// protocol timeouts) that surface outside any try/catch. Without these guards
// Node's default is to print the error and exit — taking the booking API down
// with it. We log loudly but keep serving HTTP.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection (ignored, server stays up):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (ignored, server stays up):', err);
});

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api', apiRoutes);
// Also expose the webhook at root path, since Meta's default suggestion is /webhook
app.use('/webhook', apiRoutes);

app.get('/', (req, res) => {
  res.send('WA Booking backend is running. See /api/health');
});

const server = app.listen(config.port, () => {
  console.log(`🚀 Server listening on http://localhost:${config.port}`);
  startWhatsApp();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${config.port} is already in use. Another copy of the backend is probably still running.`
    );
  } else {
    console.error('❌ HTTP server error:', err);
  }
  process.exit(1);
});

function startWhatsApp() {
  if (config.waProvider === 'webjs') {
    console.log('Starting WhatsApp (whatsapp-web.js) client... scan the QR code below when it appears.');
    try {
      const { startWebJsClient } = require('./whatsapp/webjsClient');
      startWebJsClient();
    } catch (err) {
      setStatus({ provider: 'webjs', status: 'unavailable', lastError: (err && err.message) || String(err) });
      console.error('❌ Could not start the WhatsApp client:', err);
      console.error('   The booking API and web chatbot keep working; only WhatsApp messaging is offline.');
    }
  } else if (config.waProvider === 'cloud') {
    setStatus({ provider: 'cloud', status: 'ready', lastError: null });
    console.log('WA_PROVIDER=cloud → using official Meta Cloud API. Webhook is live at /api/webhook/whatsapp');
  } else {
    setStatus({ provider: config.waProvider, status: 'disabled' });
    console.warn(`Unknown WA_PROVIDER "${config.waProvider}". Set it to "webjs" or "cloud" in .env`);
  }
}
