# WA_Booking_System-Server

Node.js + Express backend for the WhatsApp Appointment Booking System.

Handles the booking conversation, drives WhatsApp (via [whatsapp-web.js](https://wwebjs.dev/)
QR linking, or the official Meta Cloud API), and stores every confirmed booking in Google
Sheets (a new tab per day). The same engine also powers the React web chatbot through `POST /api/chat`.

## Requirements

- Node.js >= 18
- Google Chrome or Microsoft Edge installed (used to run WhatsApp Web when `WA_PROVIDER=webjs`)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

| Var | Purpose |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `CORS_ORIGIN` | Frontend origin allowed to call the API |
| `WA_PROVIDER` | `webjs` (free QR linking) or `cloud` (Meta Cloud API) |
| `PUPPETEER_EXECUTABLE_PATH` | Path to `chrome.exe` / `msedge.exe`. Leave blank to auto-detect. Only used for `webjs`. |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to the service-account JSON key |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from the sheet URL |
| `BUSINESS_NAME`, `SERVICES`, `WORKING_HOURS` | Shown to users in the chat |

## Run

```bash
npm start      # or: npm run dev  (nodemon)
```

With `WA_PROVIDER=webjs`, a QR code prints in the terminal — scan it from
**WhatsApp → Linked Devices → Link a Device**.

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Status incl. a `whatsapp` block (`starting`/`qr`/`ready`/`unavailable`) |
| `GET` | `/api/whatsapp/status` | Detailed WhatsApp link status + current QR string |
| `GET` | `/api/services` | Configured service list |
| `POST` | `/api/chat` | Web chatbot — `{ sessionId, message }` |
| `GET`/`POST` | `/api/webhook/whatsapp` | Meta Cloud API webhook (only when `WA_PROVIDER=cloud`) |

A WhatsApp/Chrome failure never takes down the API — WhatsApp degrades to `unavailable`
while the booking API and web chatbot keep serving.
