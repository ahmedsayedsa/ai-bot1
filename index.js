/**
 * index.js
 * WhatsApp Subscriptions Bot: Express + Baileys + Firestore + Easy Order webhook
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const QRCode = require('qrcode');
const session = require('cookie-session');
require('dotenv').config();

const admin = require('firebase-admin');
try { admin.initializeApp({ credential: admin.credential.applicationDefault() }); } catch {}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');

// ---------- ENV ----------
const PORT = process.env.PORT || 8080;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

// ---------- Ensure session dir ----------
const AUTH_DIR = path.join(process.cwd(), 'auth_info_session');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// ---------- App ----------
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(
  session({
    name: 'sess',
    keys: [SESSION_SECRET],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Runtime ----------
const bootTime = Date.now();
let lastQR = null;
let waStatus = 'disconnected';
let sock = null;

// Initialize global metrics doc if needed
const METRICS_DOC = db.collection('metrics').doc('global');
async function ensureMetrics() {
  await METRICS_DOC.set(
    {
      messagesSent: FieldValue.increment(0),
      uptimeStart: admin.firestore.Timestamp.fromDate(new Date())
    },
    { merge: true }
  );
}
ensureMetrics().catch(() => {});

// ---------- Firestore helpers ----------
const USERS = db.collection('users');

function jidFromPhone(phone) {
  return `${String(phone).replace(/\s|\+/g, '')}@s.whatsapp.net`;
}
function phoneFromJid(jid) {
  return String(jid || '').replace('@s.whatsapp.net', '');
}
function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d;
}
async function incrementGlobalMessages(n = 1) {
  await METRICS_DOC.set({ messagesSent: FieldValue.increment(n) }, { merge: true });
}
async function incrementUserMessages(jid, n = 1) {
  await USERS.doc(jid).set(
    { stats: { messagesSent: FieldValue.increment(n) } },
    { merge: true }
  );
}

// ---------- Template helper ----------
function formatTemplate(template, user, vars = {}) {
  const endDate =
    user?.subscription?.endDate?.toDate
      ? user.subscription.endDate.toDate()
      : null;
  const map = {
    '{name}': user?.name || '',
    '{phone}': phoneFromJid(user?.whatsappJid),
    '{endDate}': endDate ? endDate.toISOString().slice(0, 10) : '',
    '{order}': vars.order || '' // string summary
  };
  let out = template || 'مرحبًا {name}! اشتراكك فعّال حتى {endDate} 🎉';
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(String(v));
  return out.trim();
}

// ---------- WhatsApp Socket ----------
async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['CloudRunBot', 'Chrome', '20.0'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) lastQR = qr;
    if (connection === 'open') {
      waStatus = 'connected';
      lastQR = null;
    } else if (connection === 'close') {
      waStatus = 'disconnected';
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(() => startSocket().catch(() => {}), 2000);
    }
  });

  // Only respond to private chats
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages?.[0];
      if (!msg || msg.key.fromMe) return;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) return;

      const userSnap = await USERS.doc(remoteJid).get();
      if (!userSnap.exists) {
        await sock.sendMessage(remoteJid, { text: 'اشتراكك منتهي' });
        await incrementGlobalMessages(1);
        await incrementUserMessages(remoteJid, 1);
        return;
      }
      const user = userSnap.data();
      const sub = user.subscription || {};
      const now = new Date();
      const endDate = sub.endDate ? sub.endDate.toDate() : null;
      const isActive = sub.status === 'active' && endDate && endDate >= now;

      if (!isActive) {
        await sock.sendMessage(remoteJid, { text: 'اشتراكك منتهي' });
        await incrementGlobalMessages(1);
        await incrementUserMessages(remoteJid, 1);
        return;
      }

      const tmpl =
        typeof user.messageTemplate === 'string' && user.messageTemplate.trim()
          ? user.messageTemplate.trim()
          : 'مرحبًا {name}! اشتراكك فعّال حتى {endDate} 🎉';
      const text = formatTemplate(tmpl, user);
      await sock.sendMessage(remoteJid, { text });
      await incrementGlobalMessages(1);
      await incrementUserMessages(remoteJid, 1);
    } catch (e) {
      console.error('messages.upsert error:', e);
    }
  });
}
startSocket().catch((e) => console.error('WA start error', e));

// ---------- Auth middlewares ----------
function requireAdmin(req, res, next) {
  if (req.session?.admin === true) return next();
  return res.status(401).json({ error: 'unauthorized' });
}
function requireUser(req, res, next) {
  if (req.session?.userPhone) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// ---------- Auth routes ----------
// Admin login (JSON)
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'invalid_credentials' });
});
app.post('/api/admin/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// User login by phone (JSON)
app.post('/api/user/login', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone_required' });
  req.session.userPhone = String(phone).replace(/\s|\+/g, '');
  res.json({ ok: true });
});
app.post('/api/user/logout', (req, res) => {
  if (req.session) req.session.userPhone = null;
  res.json({ ok: true });
});

// ---------- APIs ----------

// 1) GET /api/users
app.get('/api/users', requireAdmin, async (_req, res) => {
  try {
    const snap = await USERS.get();
    const items = snap.docs.map((d) => {
      const v = d.data();
      return {
        name: v.name || '',
        phone: phoneFromJid(v.whatsappJid),
        status: v.subscription?.status || 'inactive',
        endDate: v.subscription?.endDate
          ? v.subscription.endDate.toDate().toISOString()
          : null,
        messageTemplate: v.messageTemplate || '',
        messagesSent: v.stats?.messagesSent || 0
      };
    });
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// 2) POST /api/users (add/update by durationDays)
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { name, phone, durationDays, status, endDate, messageTemplate } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone_required' });

    const jid = jidFromPhone(phone);
    let finalEnd = null;
    if (endDate) {
      const d = new Date(endDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'invalid_endDate' });
      finalEnd = d;
    } else if (durationDays != null) {
      finalEnd = addDays(new Date(), Number(durationDays));
    }

    const doc = {
      name: name || '',
      whatsappJid: jid,
      subscription: {
        status: status === 'inactive' ? 'inactive' : 'active',
        endDate: finalEnd ? admin.firestore.Timestamp.fromDate(finalEnd) : null
      },
      messageTemplate: messageTemplate || '',
      stats: { messagesSent: FieldValue.increment(0) }
    };
    await USERS.doc(jid).set(doc, { merge: true });
    res.json({ ok: true, id: jid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// 3) DELETE /api/users?phone=...
app.delete('/api/users', requireAdmin, async (req, res) => {
  try {
    const { phone } = req.query || {};
    if (!phone) return res.status(400).json({ error: 'phone_required' });
    const jid = jidFromPhone(phone);
    await USERS.doc(jid).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// 4) POST /api/template
app.post('/api/template', requireAdmin, async (req, res) => {
  try {
    const { phone, template } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone_required' });
    const jid = jidFromPhone(phone);
    await USERS.doc(jid).set({ messageTemplate: template || '' }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// 5) GET /api/status
app.get('/api/status', async (_req, res) => {
  try {
    const ms = Date.now() - bootTime;
    const metrics = await METRICS_DOC.get();
    res.json({
      connected: waStatus === 'connected',
      qrAvailable: Boolean(lastQR),
      uptimeSeconds: Math.floor(ms / 1000),
      globalMessagesSent: metrics.exists ? metrics.data().messagesSent || 0 : 0
    });
  } catch (e) {
    res.status(500).json({ error: 'internal' });
  }
});

// 6) GET /api/qr (image + text)
app.get('/api/qr', async (_req, res) => {
  try {
    if (!lastQR) return res.status(204).json({});
    const dataUrl = await QRCode.toDataURL(lastQR, { width: 300, margin: 2 });
    res.json({ qr: lastQR, dataUrl });
  } catch (e) {
    res.status(500).json({ error: 'internal' });
  }
});

// 6b) PNG for embedding
app.get('/api/qr.png', async (_req, res) => {
  try {
    if (!lastQR) return res.status(204).end();
    const png = await QRCode.toBuffer(lastQR, { type: 'png', width: 320, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch {
    res.status(500).end();
  }
});

// 7) POST /api/webhook/easyorder
// Expected flexible payload:
// {
//   "userPhone": "2010...",
//   "customerPhone": "2012...",
//   "orderId": "EO-123",
//   "customerName": "أحمد",
//   "items": [{"name":"منتج","qty":2,"price":50}],
//   "total": 100
// }
app.post('/api/webhook/easyorder', async (req, res) => {
  try {
    const body = req.body || {};
    const userJid = jidFromPhone(body.userPhone || '');
    const custJid = jidFromPhone(body.customerPhone || '');
    if (!userJid || !custJid.includes('@s.whatsapp.net')) {
      return res.status(400).json({ error: 'missing_user_or_customer_phone' });
    }
    if (!sock) return res.status(503).json({ error: 'bot_not_ready' });

    // Load merchant user to pick template
    const userSnap = await USERS.doc(userJid).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'user_not_found' });
    const user = userSnap.data();

    // Build order summary for {order}
    const items = Array.isArray(body.items) ? body.items : [];
    const lines = items.map((it) => `- ${it.name} x${it.qty} = ${it.price * it.qty}`).join('\n');
    const orderSummary =
      `رقم الطلب: ${body.orderId || '-'}\n` +
      (body.customerName ? `العميل: ${body.customerName}\n` : '') +
      (lines ? `المنتجات:\n${lines}\n` : '') +
      (body.total ? `الإجمالي: ${body.total}` : '');

    // Choose template (can be merchant-specific)
    const template =
      (user.messageTemplate && user.messageTemplate.trim()) ||
      'مرحبًا {name}! تم استلام طلبك. التفاصيل:\n{order}';

    const fakeCustomer = { name: body.customerName || '', whatsappJid: custJid, subscription: { status: 'active' } };
    const text = formatTemplate(template, fakeCustomer, { order: orderSummary });

    await sock.sendMessage(custJid, { text });
    await incrementGlobalMessages(1);
    // Track against merchant and customer documents
    await incrementUserMessages(userJid, 1);
    await incrementUserMessages(custJid, 1);

    res.json({ ok: true });
  } catch (e) {
    console.error('easyorder webhook error:', e);
    res.status(500).json({ error: 'internal' });
  }
});

// ---------- User-facing APIs for /user ----------
app.get('/api/me', requireUser, async (req, res) => {
  try {
    const phone = req.session.userPhone;
    const jid = jidFromPhone(phone);
    const snap = await USERS.doc(jid).get();
    const user = snap.exists ? snap.data() : null;
    const endDate = user?.subscription?.endDate ? user.subscription.endDate.toDate().toISOString() : null;
    const metrics = await METRICS_DOC.get();
    res.json({
      phone,
      user: user
        ? {
            name: user.name || '',
            status: user.subscription?.status || 'inactive',
            endDate,
            messageTemplate: user.messageTemplate || '',
            messagesSent: user.stats?.messagesSent || 0
          }
        : null,
      webhook: `${req.protocol}://${req.get('host')}/api/webhook/easyorder?userPhone=${phone}`,
      bot: {
        connected: waStatus === 'connected',
        qrAvailable: Boolean(lastQR),
        uptimeSeconds: Math.floor((Date.now() - bootTime) / 1000),
        globalMessagesSent: metrics.exists ? metrics.data().messagesSent || 0 : 0
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'internal' });
  }
});

// Allow user to update own template
app.post('/api/me/template', requireUser, async (req, res) => {
  try {
    const phone = req.session.userPhone;
    const jid = jidFromPhone(phone);
    await USERS.doc(jid).set({ messageTemplate: String(req.body?.template || '') }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'internal' });
  }
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).type('html').send(`
<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>404</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
</head><body class="bg-light">
<div class="container py-5 text-center">
  <h3>الصفحة غير موجودة</h3>
  <p class="text-muted">تأكد من الرابط أو عُد إلى <a href="/">الصفحة الرئيسية</a>.</p>
</div></body></html>`);
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
