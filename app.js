require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const usePair = process.env.USE_PAIR_CODE === 'true';
    const phoneNumber = process.env.PHONE_NUMBER || '';

    console.log(`[CONFIG] Mode: ${usePair ? 'PAIR CODE + QR' : 'QR ONLY'}`);
    if(phoneNumber) console.log(`[CONFIG] Number from .env: ${phoneNumber}`);

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: !usePair, // Show QR if not using pair
        auth: state,
        browser: ['CHRISS-MD', 'Chrome', '3.0.0'],
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    // PAIR CODE from .env
    if (usePair && !sock.authState.creds.registered) {
        if (!phoneNumber) {
            console.log('[ERROR] PHONE_NUMBER not set in .env');
            console.log('Set PHONE_NUMBER=2637XXXXXXXX in .env file');
            return;
        }
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        console.log(`[PAIR] Waiting 3 sec then requesting code for ${cleanNumber}...`);
        await new Promise(r => setTimeout(r, 3000));
        try {
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(`\n╔════════════════════╗`);
            console.log(`║  PAIR CODE: ${code}  ║`);
            console.log(`╚════════════════════╝\n`);
            console.log('WhatsApp > Linked Devices > Link with phone number');
        } catch (e) {
            console.log('[PAIR ERROR]', e.message);
            console.log('Falling back to QR...');
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Show QR even in pair mode if available
        if (qr && usePair) {
            console.log('[QR] QR Available too (if you want to scan):');
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`[BOT] Closed, reason: ${reason}, reconnecting...`);
            startBot();
        } else if (connection === 'open') {
            console.log('[BOT] ✅ CHRISS-MD CONNECTED - BOTH METHODS READY - ALIVE FOREVER');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (body.toLowerCase() === 'ping') {
            await sock.sendMessage(from, { text: `✅ Alive!\nMode: QR + Pair\nUptime: ${process.uptime().toFixed(0)}s` });
        }
    });
}

startBot();
