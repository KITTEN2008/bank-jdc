require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Роуты
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transferRoutes = require('./routes/transfers');
const loanRoutes = require('./routes/loans');
const invoiceRoutes = require('./routes/invoices');

const app = express();
const PORT = process.env.PORT || 3000;

// Безопасность
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов с одного IP
});
app.use('/api', limiter);

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/invoices', invoiceRoutes);

// Проверка здоровья
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    memory: process.memoryUsage()
  });
});

// Обработчик ошибок
app.use(errorHandler);

// Инициализация БД и запуск сервера
async function startServer() {
  try {
    // Проверка соединения с БД
    await db.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}
// Добавьте после подключения db, перед startServer()
const initializeDatabase = require('./config/init');

async function startServer() {
  try {
    await db.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    
    // Инициализация таблиц
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
