const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./queries/userQueries");

const seedAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.getUserByEmail("admin@iau.com");

    if (existingAdmin) {
      console.log(" Admin user already exists");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // Create admin user
    await User.createUser({
      fullName: "Admin User",
      email: "admin@iau.com",
      password: hashedPassword,
      role: "Admin",
      department: "Internal Audit Unit"
    });

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
