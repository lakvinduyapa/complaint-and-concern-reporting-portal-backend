const app = require('./app');
const db = require('./config/db');

const port = process.env.PORT || 5051;

async function startServer() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL password.');
    process.exit(1);
  }

  try {
    await db.query('SELECT 1');
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

startServer();
