const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");
const QRCode = require("qrcode");

// إعداد السيرفر
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Firestore
const firestore = new Firestore();
const usersCollection = firestore.collection("users");

// ✅ صفحة رئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ صفحة الأدمن
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ✅ صفحة اليوزر
app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user.html"));
});


// -----------------
// 🔹 API: إدارة المستخدمين
// -----------------

// إضافة / تحديث مستخدم
app.post("/api/users", async (req, res) => {
  try {
    const { name, phone, status, endDate } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    await usersCollection.doc(phone).set({
      name,
      whatsappJid: `${phone}@s.whatsapp.net`,
      subscription: {
        status: status || "inactive",
        endDate: endDate || null,
      },
      messagesSent: 0,
      messageTemplate: "",
    }, { merge: true });

    res.json({ success: true, message: "User added/updated successfully" });
  } catch (err) {
    console.error("Error adding/updating user:", err);
    res.status(500).json({ error: "Failed to add/update user" });
  }
});

// جلب بيانات يوزر واحد
app.get("/api/users/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const userDoc = await usersCollection.doc(phone).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(userDoc.data());
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// حفظ قالب الرسالة
app.post("/api/users/:phone/template", async (req, res) => {
  try {
    const phone = req.params.phone;
    const { messageTemplate } = req.body;

    const userRef = usersCollection.doc(phone);
    await userRef.set({ messageTemplate }, { merge: true });

    res.json({ success: true, message: "تم تحديث الرسالة المخصصة" });
  } catch (err) {
    console.error("Error saving template:", err);
    res.status(500).json({ error: "فشل تحديث الرسالة" });
  }
});


// -----------------
// 🔹 API: QR Code
// -----------------
app.get("/api/qr/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const qrText = `whatsapp://send?phone=${phone}`;
    const qrDataUrl = await QRCode.toDataURL(qrText);
    const img = Buffer.from(qrDataUrl.split(",")[1], "base64");

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    });
    res.end(img);
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});


// -----------------
// 🔹 API: Webhook (يستقبل رسائل من EasyOrder أو أي Integration)
// -----------------
app.post("/webhook/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const payload = req.body;

    const userRef = usersCollection.doc(phone);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const template = userData.messageTemplate || "مرحبا، تم استلام طلبك!";

    console.log(`📩 رسالة للرقم ${phone}: ${template}`);

    // زيادة عدد الرسائل
    const newCount = (userData.messagesSent || 0) + 1;
    await userRef.set({ messagesSent: newCount }, { merge: true });

    res.json({ success: true, message: "تم استقبال الرسالة", sent: template });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});


// -----------------
// 🚀 Start Server
// -----------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
