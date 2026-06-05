require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const connectDB = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL Connected Successfully");
  } catch (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }
};

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

pool.connectDB = connectDB;

module.exports = pool;