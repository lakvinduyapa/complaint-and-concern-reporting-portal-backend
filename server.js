const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// DB connection
const { connectDB } = require("./config/db");

dotenv.config();

const app = express();

// ========================================
// DATABASE CONNECTION
// ========================================
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

// ========================================
// SECURITY MIDDLEWARE
// ========================================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP. Please try again later.",
});

app.use(limiter);

// ========================================
// CORS CONFIG
// ========================================
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ========================================
// BODY PARSER
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// LOGGER
// ========================================
app.use(morgan("dev"));

// ========================================
// STATIC FILES - EVIDENCE UPLOADS
// ========================================
app.use("/uploads", express.static("uploads"));

// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Complaint Portal API Running (PERN Version)",
  });
});

// ========================================
// ROUTES
// ========================================

// Admin
app.use("/api/admin/auth", require("./routes/admin/authRoutes"));
app.use("/api/admin/dashboard", require("./routes/admin/dashboardRoutes"));
app.use("/api/admin/complaints", require("./routes/admin/complaintRoutes"));
app.use("/api/admin/status", require("./routes/admin/statusRoutes"));
app.use("/api/admin/audit", require("./routes/admin/auditRoutes"));
app.use("/api/admin/reports", require("./routes/admin/reportRoutes"));

// Public
app.use("/api/public/complaints", require("./routes/public/complaintRoutes"));
app.use("/api/public/tracking", require("./routes/public/trackingRoutes"));
app.use("/api/public/evidence", require("./routes/public/evidenceRoutes"));

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});