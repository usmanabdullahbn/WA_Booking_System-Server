const path = require('path');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const config = require('../config/env');

const HEADERS = [
  'Booking ID',
  'Timestamp',
  'Customer Name',
  'Phone / Contact',
  'Service',
  'Date Requested',
  'Time Requested',
  'Source',
  'Status',
];

let sheetsClientPromise = null;

function getSheetsClient() {
  if (!sheetsClientPromise) {
    const keyFile = path.isAbsolute(config.google.keyPath)
      ? config.google.keyPath
      : path.join(process.cwd(), config.google.keyPath);

    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClientPromise = auth.getClient().then((authClient) => google.sheets({ version: 'v4', auth: authClient }));
  }
  return sheetsClientPromise;
}

function todaySheetTitle() {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Makes sure a tab for today's date exists in the target spreadsheet.
 * Creates it (with header row) if it doesn't exist yet.
 * Returns the sheet title (e.g. "2026-08-27").
 */
async function ensureTodaySheet() {
  const sheets = await getSheetsClient();
  const spreadsheetId = config.google.sheetId;
  const title = todaySheetTitle();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.find((s) => s.properties.title === title);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }

  return title;
}

/**
 * Appends one booking row into today's tab, creating the tab first if needed.
 * @param {{id:string, name:string, contact:string, service:string, date:string, time:string, source:string, status:string}} booking
 */
async function appendBooking(booking) {
  const sheets = await getSheetsClient();
  const spreadsheetId = config.google.sheetId;
  const title = await ensureTodaySheet();

  const row = [
    booking.id,
    dayjs().format('YYYY-MM-DD HH:mm:ss'),
    booking.name,
    booking.contact,
    booking.service,
    booking.date,
    booking.time,
    booking.source || 'whatsapp',
    booking.status || 'Pending',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${title}!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { sheetTitle: title, row };
}

module.exports = {
  ensureTodaySheet,
  appendBooking,
  todaySheetTitle,
};
