const { getSession, resetSession } = require('./sessionStore');
const bookingService = require('../services/bookingService');
const config = require('../config/env');

const GREETINGS = ['hi', 'hello', 'hey', 'start', 'book', 'menu', 'hi there'];

function serviceMenu() {
  return config.business.services.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

function welcomeMessage() {
  return (
    `👋 Welcome to *${config.business.name}*!\n\n` +
    `I can help you book an appointment. Type *book* to start, or *cancel* anytime to stop.`
  );
}

function askName() {
  return `Great! What's your *full name*?`;
}

function askService() {
  return `Which service would you like?\n\n${serviceMenu()}\n\nReply with the number or the service name.`;
}

function askDate() {
  return `📅 What date would you like to come in? (e.g. 28-08-2026)`;
}

function askTime() {
  return `⏰ What time works for you? (e.g. 14:30). Our hours: ${config.business.workingHours}`;
}

function askConfirm(data) {
  return (
    `Please confirm your booking:\n\n` +
    `👤 Name: ${data.name}\n` +
    `💈 Service: ${data.service}\n` +
    `📅 Date: ${data.date}\n` +
    `⏰ Time: ${data.time}\n\n` +
    `Reply *yes* to confirm or *no* to start over.`
  );
}

function resolveService(input) {
  const services = config.business.services;
  const asNumber = parseInt(input, 10);
  if (!Number.isNaN(asNumber) && services[asNumber - 1]) {
    return services[asNumber - 1];
  }
  const match = services.find((s) => s.toLowerCase() === input.trim().toLowerCase());
  if (match) return match;
  // allow free-text service too, so the bot stays flexible
  return input.trim();
}

/**
 * Processes one inbound message for a given userId and returns the reply text.
 * Also returns { bookingCreated, booking } when a booking was just saved.
 *
 * @param {string} userId - unique id for this conversation (phone number, or web session id)
 * @param {string} rawMessage
 * @param {string} contact - phone/email/identifier to store in the sheet
 * @param {string} source - "whatsapp" | "web"
 */
async function handleMessage(userId, rawMessage, contact, source = 'whatsapp') {
  const message = (rawMessage || '').trim();
  const lower = message.toLowerCase();
  const session = getSession(userId);

  if (lower === 'cancel') {
    resetSession(userId);
    return { reply: `❌ Booking cancelled. Type *book* anytime to start again.` };
  }

  switch (session.state) {
    case 'IDLE': {
      if (GREETINGS.includes(lower)) {
        session.state = 'NAME';
        return { reply: `${welcomeMessage()}\n\n${askName()}` };
      }
      return { reply: welcomeMessage() };
    }

    case 'NAME': {
      if (!message) return { reply: `Please type your name.` };
      session.data.name = message;
      session.state = 'SERVICE';
      return { reply: askService() };
    }

    case 'SERVICE': {
      const service = resolveService(message);
      if (!service) return { reply: `Please pick a valid service.\n\n${serviceMenu()}` };
      session.data.service = service;
      session.state = 'DATE';
      return { reply: askDate() };
    }

    case 'DATE': {
      if (!bookingService.isValidDate(message)) {
        return { reply: `That date doesn't look right. Please use format DD-MM-YYYY, e.g. 28-08-2026.` };
      }
      session.data.date = message;
      session.state = 'TIME';
      return { reply: askTime() };
    }

    case 'TIME': {
      if (!bookingService.isValidTime(message)) {
        return { reply: `That time doesn't look right. Please use format HH:mm, e.g. 14:30.` };
      }
      session.data.time = message;
      session.state = 'CONFIRM';
      return { reply: askConfirm(session.data) };
    }

    case 'CONFIRM': {
      if (lower === 'yes' || lower === 'y') {
        const { booking, sheetTitle } = await bookingService.createBooking({
          name: session.data.name,
          contact,
          service: session.data.service,
          date: session.data.date,
          time: session.data.time,
          source,
        });
        resetSession(userId);
        return {
          reply:
            `✅ You're all set, ${booking.name}!\n\n` +
            `Booking ID: *${booking.id}*\n` +
            `${booking.service} on ${booking.date} at ${booking.time}\n\n` +
            `We saved it in our system (sheet tab: ${sheetTitle}). See you then!`,
          bookingCreated: true,
          booking,
        };
      }
      if (lower === 'no' || lower === 'n') {
        resetSession(userId);
        return { reply: `No problem, let's start over. Type *book* when you're ready.` };
      }
      return { reply: `Please reply *yes* to confirm or *no* to cancel.` };
    }

    default: {
      resetSession(userId);
      return { reply: welcomeMessage() };
    }
  }
}

module.exports = { handleMessage };
