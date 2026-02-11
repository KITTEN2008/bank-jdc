const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.RENDER === 'true') {
  // Для Render — берём DATABASE_URL из переменных окружения
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Локальная разработка
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
