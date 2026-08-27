const express = require('express');
const conversationEngine = require('../chat/conversationEngine');
const cloudApiClient = require('../whatsapp/cloudApiClient');
const config = require('../config/env');
const { getStatus: getWaStatus } = require('../whatsapp/status');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    business: config.business.name,
    waProvider: config.waProvider,
    whatsapp: getWaStatus(),
  });
});

// Detailed WhatsApp link status (used by an admin/setup screen).
// Returns the current QR string while unlinked so a UI can render it.
router.get('/whatsapp/status', (req, res) => {
  res.json(getWaStatus());
});

router.get('/services', (req, res) => {
  res.json({ services: config.business.services });
});

// Used by the React web chatbot.
// body: { sessionId: string, message: string }
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || typeof message !== 'string') {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }
    const userId = `web:${sessionId}`;
    const result = await conversationEngine.handleMessage(userId, message, sessionId, 'web');
    res.json(result);
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Only relevant when WA_PROVIDER=cloud (official Meta Cloud API webhook)
router.get('/webhook/whatsapp', cloudApiClient.verifyWebhook);
router.post('/webhook/whatsapp', cloudApiClient.receiveWebhook);

module.exports = router;
