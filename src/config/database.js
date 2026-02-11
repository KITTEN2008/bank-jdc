const { Pool } = require('pg');
require('dotenv').config();

// Берём любую переменную, которая похожа на URL базы данных
const dbUrl = process.env.DATABASE_URL || 
              process.env.DATABASE_URL || 
              process.env.DATABASE_URL || 
              process.env.DATABASE_URL;  // ищем в разных регистрах

let pool;

if (dbUrl) {
  // Работаем на Render с любой переменной
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Локальная разработка
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bank_jdc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
