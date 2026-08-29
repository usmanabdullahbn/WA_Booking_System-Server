/**
 * Seeds the configured Google Sheet with dummy bookings across several date tabs,
 * for testing. Uses the same auth + tab layout as the live app.
 *
 * Prereqs (see README section 2):
 *   1. backend/google-service-account-key.json  exists
 *   2. GOOGLE_SHEET_ID is set in backend/.env
 *   3. The sheet is shared (Editor) with the service account's client_email
 *
 * Run:  node scripts/seed-sheet.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const { nanoid } = require('nanoid');
const config = require('../src/config/env');

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

// A few fake customers / bookings to spread across the tabs.
const NAMES = [
  'Ayesha Siddiqui', 'Bilal Ahmed', 'Fatima Noor', 'Hamza Tariq', 'Zainab Ali',
  'Usman Abdullah', 'Maryam Khan', 'Daniyal Raza', 'Sana Malik', 'Omar Farooq',
];
const SERVICES = config.business.services;
const TIMES = ['10:00', '11:30', '13:00', '15:15', '17:45', '19:00'];
const STATUSES = ['Confirmed', 'Confirmed', 'Confirmed', 'Pending', 'Cancelled'];
const SOURCES = ['whatsapp', 'whatsapp', 'web'];

function pick(arr, i) {
  return arr[i % arr.length];
}

function phone(i) {
  return '9230' + String(10000000 + i * 137).slice(0, 8);
}

async function getSheets() {
  const keyFile = path.isAbsolute(config.google.keyPath)
    ? config.google.keyPath
    : path.join(process.cwd(), config.google.keyPath);

  if (!fs.existsSync(keyFile)) {
    console.error(`❌ Service-account key file not found: ${keyFile}`);
    console.error('   Create a service account in Google Cloud Console, download its');
    console.error('   JSON key, save it there, then share the sheet with its client_email.');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

async function ensureSheet(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some((s) => s.properties.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    console.log(`  + created tab "${title}" with header row`);
  } else {
    console.log(`  = tab "${title}" already exists`);
  }
}

async function seedDay(sheets, spreadsheetId, dateObj, rowsPerDay, startIndex) {
  const title = dateObj.format('YYYY-MM-DD');
  await ensureSheet(sheets, spreadsheetId, title);

  const rows = [];
  for (let r = 0; r < rowsPerDay; r++) {
    const i = startIndex + r;
    rows.push([
      nanoid(8).toUpperCase(),
      dateObj.hour(9).minute(0).second(0).add(r * 17, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      pick(NAMES, i),
      phone(i),
      pick(SERVICES, i),
      dateObj.format('DD-MM-YYYY'),
      pick(TIMES, i),
      pick(SOURCES, i),
      pick(STATUSES, i),
    ]);
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${title}!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
  console.log(`  -> appended ${rows.length} dummy bookings to "${title}"`);
  return rows.length;
}

async function main() {
  const spreadsheetId = config.google.sheetId;
  if (!spreadsheetId || spreadsheetId === 'your-google-spreadsheet-id') {
    console.error('❌ GOOGLE_SHEET_ID is not set in backend/.env');
    process.exit(1);
  }

  console.log(`📄 Seeding spreadsheet ${spreadsheetId}`);
  const sheets = await getSheets();

  // Make sure we can actually reach it (clear error if sharing is missing).
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`   Title: "${meta.data.properties.title}"`);
  } catch (err) {
    console.error('❌ Could not open the spreadsheet. Most likely the sheet is not shared');
    console.error('   with the service account\'s client_email as an Editor.');
    console.error('   Underlying error:', err.message);
    process.exit(1);
  }

  // 5 tabs: two days ago .. two days ahead.
  const days = [-2, -1, 0, 1, 2].map((d) => dayjs().add(d, 'day'));
  const rowsPerDay = 5;
  let idx = 0;
  let total = 0;
  for (const day of days) {
    total += await seedDay(sheets, spreadsheetId, day, rowsPerDay, idx);
    idx += rowsPerDay;
  }

  console.log(`\n✅ Done. Inserted ${total} dummy bookings across ${days.length} date tabs.`);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
