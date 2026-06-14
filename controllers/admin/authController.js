const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const User = require("../../queries/userQueries.js");

const authDebugLogPath = path.join(__dirname, "..", "..", "auth-debug.log");

const writeAuthDebug = (label, data) => {
  try {
    fs.appendFileSync(
      authDebugLogPath,
      `${new Date().toISOString()} ${label} ${JSON.stringify(data)}\n`
    );
  } catch (logError) {
    console.warn("Auth debug log write failed:", logError.message);
  }
};

const normalizeUserRow = (user) => ({
  id: user.id ?? user.user_id,
  email: user.email,
  role: user.role ?? user.user_role,
  isActive: user.is_active ?? user.isActive,
  fullName: user.full_name ?? user.fullName,
  department: user.department,
  lastLogin: user.last_login ?? user.lastLogin,
  passwordHash: user.password ?? user.password_hash ?? user.passwordHash,
});

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const normalizedUser = normalizeUserRow(user);

    const allowedRoles = ["admin", "senior_investigator", "officer"];

    if (
      !allowedRoles.includes(String(normalizedUser.role || "").toLowerCase())
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (normalizedUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (
      typeof normalizedUser.passwordHash !== "string" ||
      !normalizedUser.passwordHash
    ) {
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      normalizedUser.passwordHash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: normalizedUser.id,
        email: normalizedUser.email,
        role: normalizedUser.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "8h" }
    );

    try {
      await User.updateLastLogin(normalizedUser.id);
    } catch (lastLoginError) {
      console.warn("Failed to update last login:", lastLoginError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: normalizedUser.id,
        fullName: normalizedUser.fullName,
        email: normalizedUser.email,
        role: normalizedUser.role,
        department: normalizedUser.department,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);

    writeAuthDebug("login-error", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Login failed",
      ...(process.env.NODE_ENV !== "production" ? { error: error.message } : {}),
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const normalizedUser = normalizeUserRow(user);

    return res.status(200).json({
      success: true,
      user: {
        id: normalizedUser.id,
        fullName: normalizedUser.fullName,
        email: normalizedUser.email,
        role: normalizedUser.role,
        department: normalizedUser.department,
        lastLogin: normalizedUser.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get Current User Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
};