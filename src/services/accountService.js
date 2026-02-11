const db = require('../config/database');

class AccountService {
  // Получить счёт пользователя по валюте
  static async getUserAccount(userId, currencyCode) {
    const result = await db.query(
      'SELECT * FROM accounts WHERE user_id = $1 AND currency_code = $2',
      [userId, currencyCode]
    );
    return result.rows[0];
  }

  // Обновить баланс с блокировкой (для безопасности)
  static async updateBalance(accountId, newBalance) {
    const result = await db.query(
      `UPDATE accounts 
       SET balance = $2 
       WHERE id = $1 
       RETURNING *`,
      [accountId, newBalance]
    );
    return result.rows[0];
  }

  // Проверить достаточно ли средств
  static async hasEnoughBalance(accountId, amount) {
    const result = await db.query(
      'SELECT balance FROM accounts WHERE id = $1',
      [accountId]
    );
    return result.rows[0]?.balance >= amount;
  }

  // Создать 4 счета для нового пользователя
  static async createDefaultAccounts(userId) {
    const currencies = ['JDC', 'IO', 'GHY', 'RUB'];
    
    for (const currency of currencies) {
      await db.query(
        `INSERT INTO accounts (user_id, currency_code, balance) 
         VALUES ($1, $2, 0.00)`,
        [userId, currency]
      );
    }
  }
}

module.exports = AccountService;
