// Resolves a Chrome/Chromium/Edge executable for puppeteer to drive.
//
// whatsapp-web.js runs WhatsApp Web inside a real Chromium browser via puppeteer.
// Puppeteer can download its own Chromium, but that often fails (no disk space,
// corporate proxy, offline machine). Since almost every Windows/macOS box already
// has Chrome or Edge installed, we prefer the system browser and only fall back
// to whatever puppeteer bundled.

const fs = require('fs');
const path = require('path');
const os = require('os');

function firstExisting(candidates) {
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (_) {
      /* ignore and keep looking */
    }
  }
  return null;
}

function windowsCandidates() {
  const roots = [
    process.env['PROGRAMFILES'] || 'C:\\Program Files',
    process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
    process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local'),
  ];
  const rel = [
    ['Google', 'Chrome', 'Application', 'chrome.exe'],
    ['Google', 'Chrome Beta', 'Application', 'chrome.exe'],
    ['Chromium', 'Application', 'chrome.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
  ];
  const out = [];
  for (const root of roots) {
    for (const parts of rel) out.push(path.join(root, ...parts));
  }
  return out;
}

function macCandidates() {
  return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    path.join(os.homedir(), 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
  ];
}

function linuxCandidates() {
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ];
}

/**
 * @param {string|null} configuredPath  Explicit path from config/.env (wins if it exists).
 * @returns {{ path: string|null, source: string }}
 */
function findChrome(configuredPath) {
  if (configuredPath) {
    const resolved = firstExisting([configuredPath]);
    if (resolved) return { path: resolved, source: 'config' };
    console.warn(
      `⚠️  Configured Chrome path does not exist: ${configuredPath} — falling back to auto-detection.`
    );
  }

  let candidates;
  if (process.platform === 'win32') candidates = windowsCandidates();
  else if (process.platform === 'darwin') candidates = macCandidates();
  else candidates = linuxCandidates();

  const found = firstExisting(candidates);
  if (found) return { path: found, source: 'system' };

  // Let puppeteer use whatever it bundled/downloaded (may be nothing).
  return { path: null, source: 'puppeteer-bundled' };
}

module.exports = { findChrome };
