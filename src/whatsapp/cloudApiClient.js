// Alternative provider: official Meta WhatsApp Cloud API.
// Use this if you have a verified WhatsApp Business account + Meta developer app.
// Enable it by setting WA_PROVIDER=cloud in .env, and pointing your Meta app's
// webhook to https://your-domain.com/webhook/whatsapp

const axios = require('axios');
const config = require('../config/env');
const conversationEngine = require('../chat/conversationEngine');

async function sendCloudMessage(toPhoneNumber, text) {
  const { token, phoneNumberId, apiVersion } = config.waCloud;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: toPhoneNumber,
      type: 'text',
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// Express router handlers - mounted in routes/api.js when WA_PROVIDER=cloud
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.waCloud.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

async function receiveWebhook(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from; // phone number, e.g. "9231XXXXXXXX"
      const text = message.text.body;
      const { reply } = await conversationEngine.handleMessage(from, text, from, 'whatsapp');
      await sendCloudMessage(from, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Cloud API webhook error:', err);
    res.sendStatus(200); // always 200 so Meta doesn't retry aggressively
  }
}

module.exports = { verifyWebhook, receiveWebhook, sendCloudMessage };
