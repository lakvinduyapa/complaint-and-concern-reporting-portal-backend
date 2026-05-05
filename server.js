const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

// Routes
const evidenceRoutes = require("./routes/evidenceRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

dotenv.config();

const app = express();

// Connect MongoDB
connectDB();

//  FIXED CORS
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// REMOVE THIS (CAUSE OF ERROR)
// app.options("*", cors());

//  Middleware
app.use(express.json());

//  Serve uploaded files
app.use("/uploads", express.static("uploads"));

//  Routes
app.use("/api/evidence", evidenceRoutes);
app.use("/api/complaints", complaintRoutes);

//  Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

//  404 handler (SAFE WAY)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//  Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});