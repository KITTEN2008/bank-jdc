const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { CURRENCIES } = require('../config/constants');
const AccountService = require('../services/accountService');
const router = express.Router();

// Получить все счета пользователя
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await db.query(
      `SELECT a.*, c.name as currency_name 
       FROM accounts a
       JOIN currencies c ON a.currency_code = c.code
       WHERE a.user_id = $1`,
      [req.user.id]
    );
    res.json(accounts.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить курсы валют
router.get('/currencies', (req, res) => {
  res.json(CURRENCIES);
});

module.exports = router;
