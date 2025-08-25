const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const { Firestore } = require("@google-cloud/firestore");

// إعداد السيرفر
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const firestore = new Firestore();
const usersCollection = firestore.collection("users");

let sock;
let qrCodeData = null;
let messageCount = 0;
let startTime = new Date();

// 📌 تشغيل واتساب
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "auth_info_session"));
  sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) {
      QRCode.toDataURL(qr, (err, url) => {
        if (!err) qrCodeData = url;
      });
    }
    if (connection === "open") {
      console.log("✅ WhatsApp connection opened!");
    }
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(startWhatsApp, 5000);
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || !msg.key.remoteJid) return;
    const senderJid = msg.key.remoteJid;
    if (senderJid.endsWith("@g.us")) return;

    try {
      const userDoc = await usersCollection.doc(senderJid).get();
      if (!userDoc.exists) {
        await sock.sendMessage(senderJid, { text: "⚠️ لم يتم العثور على اشتراك. يرجى التسجيل." });
        return;
      }

      const userData = userDoc.data();
      const sub = userData.subscription;
      if (!sub || sub.status !== "active" || new Date(sub.endDate) < new Date()) {
        await sock.sendMessage(senderJid, { text: "⛔ اشتراكك غير فعال أو منتهي." });
        return;
      }

      // تخصيص الرسالة
      const msgTemplate = userData.messageTemplate || "👋 أهلاً {name}، اشتراكك فعال حتى {endDate}";
      const replyText = msgTemplate
        .replace("{name}", userData.name)
        .replace("{endDate}", new Date(sub.endDate).toLocaleDateString());

      await sock.sendMessage(senderJid, { text: replyText });
      messageCount++;

    } catch (err) {
      console.error("Error processing message:", err);
    }
  });
}

startWhatsApp();

// ------------------ APIs ------------------ //

// صفحة اليوزر
app.get("/user", (req, res) => {
  res.send(`
    <h2>لوحة المستخدم</h2>
    ${qrCodeData ? `<img src="${qrCodeData}" alt="QR Code" />` : "<p>بانتظار توليد QR...</p>"}
    <form method="POST" action="/api/customize">
      <input type="text" name="phone" placeholder="رقم الهاتف" required/>
      <input type="text" name="messageTemplate" placeholder="قالب الرسالة (مثال: أهلاً {name})" required/>
      <button type="submit">حفظ</button>
    </form>
    <p>⏳ البوت شغال منذ: ${Math.floor((Date.now() - startTime.getTime()) / 1000)} ثانية</p>
    <p>📩 عدد الرسائل المرسلة: ${messageCount}</p>
    <p>🌐 Webhook: https://your-domain.com/webhook</p>
  `);
});

// تخصيص الرسالة
app.post("/api/customize", express.urlencoded({ extended: true }), async (req, res) => {
  const { phone, messageTemplate } = req.body;
  if (!phone || !messageTemplate) return res.status(400).json({ error: "بيانات ناقصة" });

  try {
    await usersCollection.doc(`${phone}@s.whatsapp.net`).set(
      { messageTemplate },
      { merge: true }
    );
    res.json({ success: true, message: "تم تحديث الرسالة المخصصة" });
  } catch (err) {
    res.status(500).json({ error: "فشل التحديث" });
  }
});

// إضافة / تعديل يوزر (للأدمن)
app.post("/api/users", async (req, res) => {
  const { name, phone, status, endDate } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name and phone are required" });

  try {
    await usersCollection.doc(`${phone}@s.whatsapp.net`).set({
      name,
      whatsappJid: `${phone}@s.whatsapp.net`,
      subscription: { status, endDate },
    }, { merge: true });

    res.json({ success: true, message: "User added/updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add/update user" });
  }
});

// ------------------ Run Server ------------------ //
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startWhatsApp(); // <-- شغل الواتساب بعد ما السيرفر يفتح
});
