const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Crash protection
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

// Load environment variables
dotenv.config();

// DB connection
const pool = require("./config/db");

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================
app.use(helmet());

// ========================================
// RATE LIMITERS
// ========================================

// Strict limiter for login/auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public API limiter
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many upload requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================================
// CORS CONFIG
// ========================================
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
// ADMIN ROUTES
// ========================================

// Apply strict limiter only to auth/login routes
app.use("/api/admin/auth", authLimiter, require("./routes/admin/authRoutes"));

// Normal admin routes should NOT use global rate limit
app.use("/api/admin/dashboard", require("./routes/admin/dashboardRoutes"));
app.use("/api/admin/complaints", require("./routes/admin/complaintRoutes"));
app.use("/api/admin/status", require("./routes/admin/statusRoutes"));
app.use("/api/admin/audit", require("./routes/admin/auditRoutes"));
app.use("/api/admin/reports", require("./routes/admin/reportRoutes"));

// ========================================
// PUBLIC ROUTES
// ========================================

app.use(
  "/api/public/complaints",
  publicLimiter,
  require("./routes/public/complaintRoutes")
);

app.use(
  "/api/public/tracking",
  publicLimiter,
  require("./routes/public/trackingRoutes")
);

app.use(
  "/api/public/evidence",
  uploadLimiter,
  require("./routes/public/evidenceRoutes")
);

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

// ========================================
// START SERVER AFTER DB CONNECTION
// ========================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();