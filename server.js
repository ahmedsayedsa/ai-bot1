import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// إعدادات الأمان (CSP)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // يسمح بملفات JS من نفس الدومين
      scriptSrcAttr: ["'none'"], // يمنع inline events
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"], // السماح بـ Bootstrap
      imgSrc: ["'self'", "data:"], // السماح بالصور و QR
    },
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API تسجيل الدخول
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@example.com" && password === "123456") {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});

// API جلب QR
app.get("/api/admin/qr", (req, res) => {
  // هنا تحط الكود اللي يولد QR
  res.status(200).sendFile(path.join(__dirname, "public", "sample-qr.png"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
