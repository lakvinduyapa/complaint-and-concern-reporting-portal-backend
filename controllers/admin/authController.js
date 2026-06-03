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

// ===============================
// ADMIN LOGIN
// ===============================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    console.log("Admin login attempt:", {
      hasEmail: Boolean(normalizedEmail),
      hasPassword: Boolean(password),
    });
    writeAuthDebug("attempt", {
      hasEmail: Boolean(normalizedEmail),
      hasPassword: Boolean(password),
    });

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get user from PostgreSQL
    const user = await User.getUserByEmail(normalizedEmail);

    console.log("Admin login user lookup:", {
      found: Boolean(user),
      email: normalizedEmail,
    });
    writeAuthDebug("lookup", {
      found: Boolean(user),
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const normalizedUser = normalizeUserRow(user);

    console.log("Admin login normalized user:", {
      id: normalizedUser.id,
      role: normalizedUser.role,
      isActive: normalizedUser.isActive,
      hasPasswordHash: Boolean(normalizedUser.passwordHash),
    });
    writeAuthDebug("normalized-user", {
      id: normalizedUser.id,
      role: normalizedUser.role,
      isActive: normalizedUser.isActive,
      hasPasswordHash: Boolean(normalizedUser.passwordHash),
    });

    // Check admin role
    const allowedRoles = [
  "admin",
  "senior_investigator",
  "officer",
  "ciaboc",
];

if (
  !allowedRoles.includes(
    String(normalizedUser.role || "").toLowerCase()
  )
) {
  return res.status(403).json({
    success: false,
    message: "Access denied",
  });
}
    




    // Check active status
    if (normalizedUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (typeof normalizedUser.passwordHash !== "string" || !normalizedUser.passwordHash) {
      console.error("Login Error: User record is missing a password hash");

      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, normalizedUser.passwordHash);

    console.log("Admin login password check:", {
      email: normalizedEmail,
      valid: isValidPassword,
    });
    writeAuthDebug("password-check", {
      email: normalizedEmail,
      valid: isValidPassword,
    });

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: normalizedUser.id,
        email: normalizedUser.email,
        role: normalizedUser.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "8h" }
    );

    // Update last login (PostgreSQL) without blocking authentication
    try {
      await User.updateLastLogin(normalizedUser.id);
    } catch (lastLoginError) {
      console.warn("Failed to update last login:", {
        message: lastLoginError.message,
        code: lastLoginError.code,
      });
      writeAuthDebug("last-login-failed", {
        message: lastLoginError.message,
        code: lastLoginError.code,
      });
    }

    // Response
    res.status(200).json({
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
    console.error("Login Error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    writeAuthDebug("login-error", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Login failed",
      ...(process.env.NODE_ENV !== "production" ? { error: error.message } : {}),
    });
  }
};

// ===============================
// GET CURRENT USER
// ===============================
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

    res.status(200).json({
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
    console.error("Get Current User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
};