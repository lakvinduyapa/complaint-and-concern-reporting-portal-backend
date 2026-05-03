const mysql = require("mysql2");

// Create connection
const db = mysql.createConnection({
  host: "127.0.0.1",   // DO NOT use localhost
  user: "root",
  password: "",        // default XAMPP password
  database: "iau_portal",
  port: 3306
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("MySQL Connected Successfully!");
  }
});

module.exports = db;