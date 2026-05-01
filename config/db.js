const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", 
  database: "iau_portal" 
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("MySQL Connected...");
  }
});

module.exports = db;