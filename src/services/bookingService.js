const { nanoid } = require('nanoid');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const sheetsService = require('./sheetsService');

dayjs.extend(customParseFormat);

function isValidDate(str) {
  return dayjs(str, ['DD-MM-YYYY', 'YYYY-MM-DD', 'D/M/YYYY'], true).isValid();
}

function isValidTime(str) {
  return dayjs(str, ['HH:mm', 'H:mm', 'hh:mm A', 'h:mm A'], true).isValid();
}

async function createBooking({ name, contact, service, date, time, source }) {
  const id = nanoid(8).toUpperCase();
  const booking = {
    id,
    name: name.trim(),
    contact,
    service: service.trim(),
    date: date.trim(),
    time: time.trim(),
    source,
    status: 'Confirmed',
  };

  const result = await sheetsService.appendBooking(booking);
  return { booking, sheetTitle: result.sheetTitle };
}

module.exports = {
  createBooking,
  isValidDate,
  isValidTime,
};
