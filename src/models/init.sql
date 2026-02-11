-- Валюты
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

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Счета
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  currency_code VARCHAR(10) REFERENCES currencies(code),
  balance DECIMAL(15,2) DEFAULT 0.00,
  opened_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, currency_code)
);

-- Транзакции
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  from_account_id INTEGER REFERENCES accounts(id),
  to_account_id INTEGER REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(10) REFERENCES currencies(code),
  converted_amount DECIMAL(15,6),
  converted_currency_code VARCHAR(10),
  type VARCHAR(50) NOT NULL, -- 'transfer', 'credit', 'invoice'
  status VARCHAR(20) DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Кредиты
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

-- Счета на оплату
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  issuer_id INTEGER REFERENCES users(id),
  payer_id INTEGER REFERENCES users(id),
  account_id INTEGER REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(10) REFERENCES currencies(code),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_to ON transactions(from_account_id, to_account_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payer_id ON invoices(payer_id);
