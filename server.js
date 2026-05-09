const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect database
connectDB();

const app = express();


// Security Middleware


app.use(helmet());


// Rate Limiter


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP. Please try again later."
});

app.use(limiter);



// CORS Configuration


app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));


// Body Parser


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Logger


app.use(morgan("dev"));



// Health Check Route


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SLTMobitel IAU Complaint Portal API Running"
  });
});



// API Routes


// Example:
// app.use("/api/public/complaints", complaintRoutes);




// 404 Handler


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});



// Server Start


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});