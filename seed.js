const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./models/User");
const connectDB = require("./config/db");

const seedAdminUser = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@iau.com" });

    if (existingAdmin) {
      console.log(" Admin user already exists");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // Create admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@iau.com",
      password: hashedPassword,
      role: "Admin",
      department: "Internal Audit Unit",
      isActive: true
    });

    await adminUser.save();

    console.log("Admin user created successfully");
    console.log("Email: admin@iau.com");
    console.log("Password: Admin@123");
    console.log("Change this password after first login!");

    process.exit(0);
  } catch (error) {
    console.error(" Seed Error:", error.message);
    process.exit(1);
  }
};

seedAdminUser();
