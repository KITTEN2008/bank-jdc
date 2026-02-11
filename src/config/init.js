const db = require('./database');

async function initializeDatabase() {
  try {
    // Проверим, есть ли уже таблицы
    const tables = await db.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );
    
    if (tables.rows.length === 0) {
      console.log('🔄 Инициализация базы данных...');
      
      // Создаём таблицы
      await db.query(`
        CREATE TABLE IF NOT EXISTS currencies (
          code VARCHAR(10) PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          rate_to_rub DECIMAL(15,6) NOT NULL
        );

        INSERT INTO currencies (code, name, rate_to_rub) VALUES
        ('JDC', 'Жад', 150),
        ('IO', 'Империал', 50),
        ('GHY', 'Расфер', 12),
        ('RUB', 'Рубль', 1)
        ON CONFLICT (code) DO NOTHING;

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          login VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          currency_code VARCHAR(10) REFERENCES currencies(code),
          balance DECIMAL(15,2) DEFAULT 0.00,
          opened_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, currency_code)
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          from_account_id INTEGER REFERENCES accounts(id),
          to_account_id INTEGER REFERENCES accounts(id),
          amount DECIMAL(15,2) NOT NULL,
          currency_code VARCHAR(10) REFERENCES currencies(code),
          converted_amount DECIMAL(15,6),
          converted_currency_code VARCHAR(10),
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'completed',
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS loans (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          account_id INTEGER REFERENCES accounts(id),
          amount DECIMAL(15,2) NOT NULL,
          currency_code VARCHAR(10) REFERENCES currencies(code),
          interest_rate DECIMAL(5,2) NOT NULL,
          amount_to_return DECIMAL(15,2) NOT NULL,
          issued_at TIMESTAMP DEFAULT NOW(),
          due_date TIMESTAMP NOT NULL,
          paid_back BOOLEAN DEFAULT FALSE,
          paid_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          issuer_id INTEGER REFERENCES users(id),
          payer_id INTEGER REFERENCES users(id),
          account_id INTEGER REFERENCES accounts(id),
          amount DECIMAL(15,2) NOT NULL,
          currency_code VARCHAR(10) REFERENCES currencies(code),
          description TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          paid_at TIMESTAMP
        );
      `);
      
      console.log('✅ База данных инициализирована');
    } else {
      console.log('✅ База данных уже готова');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error.message);
  }
}

module.exports = initializeDatabase;
