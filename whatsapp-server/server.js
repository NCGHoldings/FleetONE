const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Twilio webhooks

// Load AI Agent
let aiAgent;
try {
  // Toggle this to './ai_agent' if you want to switch back to Gemini API
  // Toggle this to './local_ai_connector' if you want to use Local AI (Ollama/LM Studio)
  aiAgent = require('./rule_based_agent');
} catch (e) {
  console.log('AI Agent not loaded:', e.message);
}

/* ─── State ─── */
let qrCodeDataUrl = null;
let connectionStatus = 'disconnected'; // disconnected | qr_ready | connected
let clientInfo = null;
const messageLog = [];

/* ─── WhatsApp Client ─── */
const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/AdrianLC99/nicefolder/main/nicecache/',
  },
  puppeteer: {
    headless: true,
    // ⚠️ IMPORTANT: Set the correct Chrome path for your OS
    // macOS:   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    // Windows: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    // Linux:   '/usr/bin/google-chrome-stable'
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    timeout: 120000, // 2 minutes for Chrome to start
    protocolTimeout: 120000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
    ],
  },
});

// ─── QR Code Event ───
waClient.on('qr', async (qr) => {
  console.log('📱 QR Code received — scan with your phone');
  connectionStatus = 'qr_ready';
  qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300 });
  broadcast({ type: 'qr', data: qrCodeDataUrl });
});

// ─── Ready Event ───
waClient.on('ready', () => {
  console.log('✅ WhatsApp is connected!');
  connectionStatus = 'connected';
  qrCodeDataUrl = null;
  clientInfo = {
    pushname: waClient.info?.pushname || 'Unknown',
    phone: waClient.info?.wid?.user || 'Unknown',
    platform: waClient.info?.platform || 'Unknown',
  };
  broadcast({ type: 'status', data: { status: 'connected', info: clientInfo } });
});

// ─── Authenticated Event ───
waClient.on('authenticated', () => {
  console.log('🔐 Authenticated successfully');
  connectionStatus = 'connecting';
  broadcast({ type: 'status', data: { status: 'connecting' } });
});

// ─── Auth Failure ───
waClient.on('auth_failure', (msg) => {
  console.error('❌ Auth failed:', msg);
  connectionStatus = 'disconnected';
  broadcast({ type: 'status', data: { status: 'auth_failed', error: msg } });
});

// ─── Disconnected ───
waClient.on('disconnected', (reason) => {
  console.log('⚠️ Disconnected:', reason);
  connectionStatus = 'disconnected';
  clientInfo = null;
  broadcast({ type: 'status', data: { status: 'disconnected', reason } });
});

// ─── Incoming Message ───
waClient.on('message', async (msg) => {
  console.log(`📩 Message from ${msg.from}: ${msg.body.substring(0, 50)}`);
  let contact;
  try { contact = await msg.getContact(); } catch { contact = null; }

  const messageData = {
    id: msg.id._serialized,
    from: msg.from,
    to: msg.to,
    body: msg.body,
    timestamp: msg.timestamp * 1000,
    fromMe: msg.fromMe,
    hasMedia: msg.hasMedia,
    type: msg.type,
    contactName: contact?.pushname || contact?.name || msg.from.replace('@c.us', ''),
    contactNumber: msg.from.replace('@c.us', ''),
  };

  messageLog.unshift(messageData);
  if (messageLog.length > 500) messageLog.pop();
  broadcast({ type: 'message', data: messageData });

  // AI Integration
  if (aiAgent && !msg.fromMe && msg.type === 'chat' && !msg.from.includes('@g.us') && msg.from !== 'status@broadcast') {
    try {
      console.log(`🤖 Processing AI response for ${msg.from}...`);
      const aiResponse = await aiAgent.processWhatsAppMessage(msg.from, msg.body);
      if (aiResponse) {
        await msg.reply(aiResponse);
      }
    } catch (err) {
      console.error('AI Processing Error:', err);
    }
  }
});

// ─── Outgoing Message (sent by us) ───
waClient.on('message_create', async (msg) => {
  if (!msg.fromMe) return;
  let contact;
  try { contact = await msg.getContact(); } catch { contact = null; }

  const messageData = {
    id: msg.id._serialized,
    from: msg.from,
    to: msg.to,
    body: msg.body,
    timestamp: msg.timestamp * 1000,
    fromMe: true,
    hasMedia: msg.hasMedia,
    type: msg.type,
    contactName: contact?.pushname || contact?.name || msg.to.replace('@c.us', ''),
    contactNumber: msg.to.replace('@c.us', ''),
  };

  messageLog.unshift(messageData);
  if (messageLog.length > 500) messageLog.pop();
  broadcast({ type: 'message', data: messageData });
});

/* ─── WebSocket Broadcasting ─── */
function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(json);
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.send(JSON.stringify({
    type: 'status',
    data: { status: connectionStatus, info: clientInfo, qr: qrCodeDataUrl },
  }));
});

/* ─── REST API Endpoints ─── */

// Twilio Voice Webhook Endpoint
app.post('/api/voice/incoming', (req, res) => {
  console.log('📞 Incoming voice call from Twilio:', req.body.From);
  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${req.headers.host}/ws/voice" />
      </Connect>
    </Response>
  `;
  res.type('text/xml');
  res.send(twiml);
});

// Get connection status
app.get('/api/status', (req, res) => {
  res.json({ status: connectionStatus, info: clientInfo });
});

// Get QR code
app.get('/api/qr', (req, res) => {
  if (connectionStatus === 'connected') return res.json({ status: 'connected', qr: null });
  res.json({ status: connectionStatus, qr: qrCodeDataUrl });
});

// Send message
app.post('/api/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Phone and message are required' });
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'WhatsApp is not connected' });

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chatId = `${cleanPhone}@c.us`;
    const sentMsg = await waClient.sendMessage(chatId, message);
    res.json({ success: true, messageId: sentMsg.id._serialized, timestamp: sentMsg.timestamp * 1000 });
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent chats
app.get('/api/chats', async (req, res) => {
  try {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'WhatsApp is not connected' });
    const chats = await waClient.getChats();
    const chatList = await Promise.all(
      chats.slice(0, 30).map(async (chat) => {
        let lastMsg = null;
        try {
          const msgs = await chat.fetchMessages({ limit: 1 });
          if (msgs.length > 0) lastMsg = { body: msgs[0].body, timestamp: msgs[0].timestamp * 1000, fromMe: msgs[0].fromMe };
        } catch { /* ignore */ }
        return {
          id: chat.id._serialized,
          name: chat.name || chat.id.user,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          timestamp: chat.timestamp ? chat.timestamp * 1000 : null,
          lastMessage: lastMsg,
          phone: chat.id.user,
        };
      })
    );
    res.json(chatList);
  } catch (error) {
    console.error('Chats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'WhatsApp is not connected' });
    const limit = parseInt(req.query.limit) || 30;
    const chat = await waClient.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit });
    const msgList = messages.map((msg) => ({
      id: msg.id._serialized,
      body: msg.body,
      timestamp: msg.timestamp * 1000,
      fromMe: msg.fromMe,
      hasMedia: msg.hasMedia,
      type: msg.type,
    }));
    res.json(msgList);
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get message log (in-memory)
app.get('/api/log', (req, res) => res.json(messageLog));

/* ══════════════════════════════════════════════════════════════
   EMAIL FUNCTIONALITY
   ══════════════════════════════════════════════════════════════ */
const nodemailer = require('nodemailer');

// Email state
let emailTransporter = null;
let emailConfig = null;
const emailSettingsPath = path.join(__dirname, '.email-settings.json');

// Load saved email settings on startup
try {
  if (fs.existsSync(emailSettingsPath)) {
    emailConfig = JSON.parse(fs.readFileSync(emailSettingsPath, 'utf8'));
    emailTransporter = nodemailer.createTransport({
      service: emailConfig.service || 'gmail',
      host: emailConfig.host,
      port: emailConfig.port || 587,
      secure: emailConfig.secure || false,
      auth: { user: emailConfig.email, pass: emailConfig.appPassword },
    });
    console.log(`📧 Email configured: ${emailConfig.email}`);
  }
} catch (e) {
  console.log('No saved email settings found');
}

// Configure email (save credentials)
app.post('/api/email/configure', async (req, res) => {
  try {
    const { email, appPassword, service, host, port, secure, senderName } = req.body;
    if (!email || !appPassword) {
      return res.status(400).json({ error: 'Email and App Password are required' });
    }

    const config = {
      email,
      appPassword,
      senderName: senderName || 'NCG Express',
      service: service || 'gmail',
      host: host || undefined,
      port: port || 587,
      secure: secure || false,
    };

    // Create transporter
    const transporterOpts = {
      auth: { user: email, pass: appPassword },
    };
    if (config.service) transporterOpts.service = config.service;
    if (config.host) { transporterOpts.host = config.host; transporterOpts.port = config.port; transporterOpts.secure = config.secure; }

    const transporter = nodemailer.createTransport(transporterOpts);

    // Verify connection
    await transporter.verify();

    // Save settings
    emailTransporter = transporter;
    emailConfig = config;
    fs.writeFileSync(emailSettingsPath, JSON.stringify(config, null, 2));

    console.log(`📧 Email configured successfully: ${email}`);
    res.json({ success: true, email, senderName: config.senderName });
  } catch (error) {
    console.error('Email config error:', error);
    res.status(500).json({ error: error.message || 'Failed to configure email. Check credentials.' });
  }
});

// Get email config status (without password)
app.get('/api/email/status', (req, res) => {
  if (emailConfig) {
    res.json({
      configured: true,
      email: emailConfig.email,
      senderName: emailConfig.senderName || 'NCG Express',
      service: emailConfig.service || 'gmail',
    });
  } else {
    res.json({ configured: false });
  }
});

// Send email
app.post('/api/email/send', async (req, res) => {
  try {
    if (!emailTransporter || !emailConfig) {
      return res.status(503).json({ error: 'Email is not configured. Set up your email first.' });
    }

    const { to, subject, body, cc, bcc, isHtml } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, Subject, and Body are required' });
    }

    const mailOptions = {
      from: `"${emailConfig.senderName || 'NCG Express'}" <${emailConfig.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      ...(cc && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc }),
    };

    if (isHtml) {
      mailOptions.html = body;
    } else {
      mailOptions.text = body;
    }

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${subject}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect email
app.post('/api/email/disconnect', (req, res) => {
  emailTransporter = null;
  emailConfig = null;
  try { fs.unlinkSync(emailSettingsPath); } catch {}
  console.log('📧 Email disconnected');
  res.json({ success: true });
});


// Disconnect and switch account
app.post('/api/disconnect', async (req, res) => {
  try {
    console.log('🔄 Disconnecting and clearing session...');
    
    // Step 1: Logout from WhatsApp
    try {
      await waClient.logout();
    } catch (e) {
      console.log('Logout warning (non-critical):', e.message);
    }
    
    // Step 2: Destroy the client
    try {
      await waClient.destroy();
    } catch (e) {
      console.log('Destroy warning (non-critical):', e.message);
    }
    
    // Step 3: Clear saved auth session
    const authPath = path.join(__dirname, '.wwebjs_auth');
    const cachePath = path.join(__dirname, '.wwebjs_cache');
    try {
      if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
      if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('🗑️ Session data cleared');
    } catch (e) {
      console.log('Clear warning (non-critical):', e.message);
    }
    
    // Step 4: Reset state
    connectionStatus = 'disconnected';
    clientInfo = null;
    qrCodeDataUrl = null;
    broadcast({ type: 'status', data: { status: 'disconnected', reason: 'user_switch' } });
    
    res.json({ success: true, message: 'Disconnected. Restarting server — reconnect in 5 seconds to scan new QR.' });
    
    // Step 5: Restart the process so a fresh client is created
    console.log('♻️ Restarting server in 2 seconds...');
    setTimeout(() => {
      process.exit(0); // PM2 or the terminal user will restart it
    }, 2000);
    
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ─── Start Server ─── */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp Server running on http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   API: http://localhost:${PORT}/api/status`);
  console.log('\n⏳ Initializing WhatsApp client...\n');
});

waClient.initialize();
