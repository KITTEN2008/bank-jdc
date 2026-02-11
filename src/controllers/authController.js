const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const AccountService = require('../services/accountService');

class AuthController {
  // Регистрация
  static async register(req, res) {
    const { login, password, fullName } = req.body;
    
    try {
      // Проверка на существование
      const existingUser = await db.query(
        'SELECT id FROM users WHERE login = $1',
        [login]
      );
      
      if (existingUser.rows[0]) {
        return res.status(400).json({ error: 'Логин уже занят' });
      }

      // Хэш пароля
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Создание пользователя
      const newUser = await db.query(
        `INSERT INTO users (login, password_hash, full_name) 
         VALUES ($1, $2, $3) RETURNING id, login, full_name`,
        [login, passwordHash, fullName]
      );
      
      const userId = newUser.rows[0].id;
      
      // Создание 4 счетов
      await AccountService.createDefaultAccounts(userId);
      
      // Генерация токена
      const token = jwt.sign(
        { id: userId, login },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({
        user: newUser.rows[0],
        token
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Вход
  static async login(req, res) {
    const { login, password } = req.body;
    
    try {
      const user = await db.query(
        'SELECT * FROM users WHERE login = $1',
        [login]
      );
      
      if (!user.rows[0]) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      const token = jwt.sign(
        { id: user.rows[0].id, login: user.rows[0].login },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        user: {
          id: user.rows[0].id,
          login: user.rows[0].login,
          full_name: user.rows[0].full_name
        },
        token
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Получить текущего пользователя
  static async getMe(req, res) {
    try {
      const accounts = await db.query(
        `SELECT a.*, c.name as currency_name 
         FROM accounts a
         JOIN currencies c ON a.currency_code = c.code
         WHERE a.user_id = $1`,
        [req.user.id]
      );
      
      res.json({
        user: req.user,
        accounts: accounts.rows
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AuthController;
