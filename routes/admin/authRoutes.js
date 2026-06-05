const express = require("express");
const router = express.Router();

const { login, getCurrentUser } = require("../../controllers/admin/authController");
const { authenticateToken } = require("../../middleware/authMiddleware");

// =======================================
// Login (Public)
// =======================================

router.post("/login", login);

// =======================================
// Get Current User (Protected)
// =======================================

router.get("/me", authenticateToken, getCurrentUser);

module.exports = router;
