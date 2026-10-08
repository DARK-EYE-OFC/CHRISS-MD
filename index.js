// UNIVERSAL INDEX.JS - Termux + Panel + Vercel
// Keeps WhatsApp alive, no sleep

const express = require('express');
const appServer = express();
const PORT = process.env.PORT || 3000;

// --- Keep Alive Server for Panel & Vercel ---
appServer.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>CHRISS-MD Alive</title></head>
      <body style="background:#000;color:#0f0;font-family:monospace;text-align:center;padding-top:50px">
        <h1>✅ BOT IS ALIVE</h1>
        <p>CHRISS-MD Running...</p>
        <p>Port: ${PORT}</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `);
});

appServer.get('/ping', (req, res) => {
  res.json({ status: 'alive', uptime: process.uptime() });
});

// Start server only if not on Vercel serverless (Vercel handles it)
if (process.env.VERCEL !== '1') {
  appServer.listen(PORT, () => {
    console.log(`[SERVER] Keep-alive server running on port ${PORT}`);
  });
}

// Prevent sleep - ping self every 4 minutes
setInterval(() => {
  console.log(`[KEEP-ALIVE] Bot alive - ${new Date().toLocaleTimeString()}`);
}, 1000 * 60 * 4);

// --- Load Main Bot (app.js) ---
try {
  console.log('[INDEX] Starting app.js...');
  require('./app.js');
} catch (err) {
  console.error('[INDEX] Failed to load app.js, trying bot logic directly...');
  console.error(err);
  
  // Fallback if app.js doesn't exist - try to start from current dir
  try {
    require('./chriss.js') || require('./bot.js') || require('./main.js');
  } catch (e) {
    console.log('[INDEX] No app.js found. Make sure app.js exists in same folder');
  }
}

// --- Anti-Crash & Keep Alive ---
process.on('uncaughtException', (err) => {
  console.log('[ANTI-CRASH] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('[ANTI-CRASH] Unhandled Rejection:', reason);
});

// For Vercel Export
module.exports = appServer;
