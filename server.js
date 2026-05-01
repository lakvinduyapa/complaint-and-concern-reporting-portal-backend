const express = require("express");
const cors = require("cors");
require("dotenv").config();

// DB connection
require("./config/db");


// Routes
const complaintRoutes = require("./routes/complaintRoutes");

const app = express();

//  Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/complaints", complaintRoutes);

//  Test route
app.get("/", (req, res) => {
  res.send("Backend is running successfully...");
});

//  Sample API test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API working " });
});

//  Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});