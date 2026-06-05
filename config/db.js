require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const connectDB = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL Connected Successfully");
  } catch (error) {
    console.error("DB Error:", error);
    process.exit(1);
  }
};

pool.connectDB = connectDB;

module.exports = pool;