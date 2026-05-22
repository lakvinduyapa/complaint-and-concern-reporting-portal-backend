const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

// Routes
const complaintRoutes = require("./routes/public/complaintRoutes");
const trackingRoutes = require("./routes/public/trackingRoutes");
const evidenceRoutes = require("./routes/public/evidenceRoutes");
const authRoutes = require("./routes/admin/authRoutes");
const dashboardRoutes = require("./routes/admin/dashboardRoutes");
const adminComplaintRoutes = require("./routes/admin/complaintRoutes");
const statusRoutes = require("./routes/admin/statusRoutes");
const auditRoutes = require("./routes/admin/auditRoutes");
const reportRoutes = require("./routes/admin/reportRoutes");

// Load Environment Variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();


// Security Middleware

app.use(helmet());


// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 100,
  message: "Too many requests from this IP. Please try again later."
});

app.use(limiter);



// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));



// Body Parser Middleware

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));



// Logger Middleware

app.use(morgan("dev"));



// Health Check Route
app.get("/", (req, res) => {

  res.status(200).json({
    success: true,
    message: "SLTMobitel IAU Complaint Portal API Running"
  });

});



// API Routes

// Admin Routes
app.use("/api/admin/auth", authRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/complaints", adminComplaintRoutes);
app.use("/api/admin/status", statusRoutes);
app.use("/api/admin/audit", auditRoutes);
app.use("/api/admin/reports", reportRoutes);

// Public Complaint Routes
app.use("/api/public/complaints", complaintRoutes);
app.use("/api/public/tracking", trackingRoutes);
app.use("/api/public/evidence", evidenceRoutes);


// 404 Handler

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "Route not found"
  });

});



// Global Error Handler

app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });

});

// Start Server

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(` Server running on port ${PORT}`);

});