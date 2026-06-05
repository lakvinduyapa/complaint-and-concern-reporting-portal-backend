require("dotenv").config();

const bcrypt = require("bcryptjs");
const User = require("./queries/userQueries");

const seedUsers = async () => {
  try {
    const users = [
      {
        fullName: "System Administrator",
        email: "admin@iau.com",
        password: "Admin@123",
        role: "admin",
        department: "Internal Affairs Unit",
      },
      {
        fullName: "Investigation Officer",
        email: "officer@iau.com",
        password: "Officer@123",
        role: "officer",
        department: "Internal Affairs Unit",
      },
      {
        fullName: "Senior Investigator",
        email: "senior@iau.com",
        password: "Senior@123",
        role: "senior_investigator",
        department: "Internal Affairs Unit",
      },
    ];

    for (const user of users) {
      const existingUser = await User.getUserByEmail(user.email);

      if (existingUser) {
        console.log("User already exists: " + user.email);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      await User.createUser({
        fullName: user.fullName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        department: user.department,
      });

      console.log("Created user: " + user.email);
    }

    console.log("");
    console.log("LOGIN ACCOUNTS");
    console.log("-----------------------------");
    console.log("Admin: admin@iau.com / Admin@123");
    console.log("Officer: officer@iau.com / Officer@123");
    console.log("Senior Investigator: senior@iau.com / Senior@123");
    console.log("-----------------------------");
    console.log("Seed completed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Seed Error:", error.message);
    process.exit(1);
  }
};

seedUsers();