const db = require('../config/database');
const CurrencyService = require('../services/currencyService');
const AccountService = require('../services/accountService');

class TransferController {
  // Перевод между счетами (своими или другому пользователю)
  static async transfer(req, res) {
    const { fromAccountId, toAccountId, amount } = req.body;
    
    // Начинаем транзакцию
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Проверяем, что fromAccount принадлежит текущему пользователю
      const fromAccount = await client.query(
        'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
        [fromAccountId, req.user.id]
      );
      
      if (!fromAccount.rows[0]) {
        throw new Error('Счёт отправителя не найден');
      }

      // 2. Проверяем toAccount
      const toAccount = await client.query(
        'SELECT * FROM accounts WHERE id = $1',
        [toAccountId]
      );
      
      if (!toAccount.rows[0]) {
        throw new Error('Счёт получателя не найден');
      }

      // 3. Проверяем баланс
      if (fromAccount.rows[0].balance < amount) {
        throw new Error('Недостаточно средств');
      }

      // 4. Конвертируем валюту если нужно
      let convertedAmount = amount;
      let convertedCurrency = fromAccount.rows[0].currency_code;
      
      if (fromAccount.rows[0].currency_code !== toAccount.rows[0].currency_code) {
        convertedAmount = CurrencyService.convert(
          amount,
          fromAccount.rows[0].currency_code,
          toAccount.rows[0].currency_code
        );
        convertedCurrency = toAccount.rows[0].currency_code;
      }

      // 5. Обновляем балансы
      const newFromBalance = parseFloat(fromAccount.rows[0].balance) - parseFloat(amount);
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [newFromBalance, fromAccountId]
      );

      const newToBalance = parseFloat(toAccount.rows[0].balance) + parseFloat(convertedAmount);
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [newToBalance, toAccountId]
      );

      // 6. Записываем транзакцию
      const transaction = await client.query(
        `INSERT INTO transactions 
         (from_account_id, to_account_id, amount, currency_code, 
          converted_amount, converted_currency_code, type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          fromAccountId, 
          toAccountId, 
          amount, 
          fromAccount.rows[0].currency_code,
          convertedAmount, 
          convertedCurrency, 
          'transfer',
          `Перевод ${amount} ${fromAccount.rows[0].currency_code}`
        ]
      );

      await client.query('COMMIT');
      
      res.json({
        message: 'Перевод выполнен успешно',
        transaction: transaction.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  // Получить историю переводов
  static async getHistory(req, res) {
    try {
      const transactions = await db.query(
        `SELECT t.*, 
          u1.full_name as from_name, a1.currency_code as from_currency,
          u2.full_name as to_name, a2.currency_code as to_currency
         FROM transactions t
         JOIN accounts a1 ON t.from_account_id = a1.id
         JOIN accounts a2 ON t.to_account_id = a2.id
         JOIN users u1 ON a1.user_id = u1.id
         JOIN users u2 ON a2.user_id = u2.id
         WHERE a1.user_id = $1 OR a2.user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [req.user.id]
      );
      
      res.json(transactions.rows);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TransferController;
