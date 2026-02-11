const db = require('../config/database');
const { CREDIT } = require('../config/constants');
const AccountService = require('../services/accountService');

class LoanController {
  // Запрос кредита
  static async requestLoan(req, res) {
    const { amount, currencyCode, days } = req.body;
    
    try {
      // Валидация
      if (amount < CREDIT.MIN_AMOUNT) {
        throw new Error(`Минимальная сумма кредита: ${CREDIT.MIN_AMOUNT}`);
      }
      if (amount > CREDIT.MAX_AMOUNT) {
        throw new Error(`Максимальная сумма кредита: ${CREDIT.MAX_AMOUNT}`);
      }
      if (days > CREDIT.MAX_TERM_DAYS) {
        throw new Error(`Максимальный срок: ${CREDIT.MAX_TERM_DAYS} дней`);
      }

      // Находим счёт пользователя
      const account = await AccountService.getUserAccount(req.user.id, currencyCode);
      if (!account) {
        throw new Error('Счёт в этой валюте не найден');
      }

      // Рассчитываем проценты
      const interestRate = CREDIT.BASE_RATE;
      const amountToReturn = amount * (1 + (interestRate / 100) * (days / 365));
      
      // Дата возврата
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      // Выдаём кредит (транзакция)
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 1. Создаём запись о кредите
        const loan = await client.query(
          `INSERT INTO loans 
           (user_id, account_id, amount, currency_code, interest_rate, amount_to_return, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [req.user.id, account.id, amount, currencyCode, interestRate, amountToReturn, dueDate]
        );

        // 2. Зачисляем деньги на счёт
        const newBalance = parseFloat(account.balance) + parseFloat(amount);
        await client.query(
          'UPDATE accounts SET balance = $1 WHERE id = $2',
          [newBalance, account.id]
        );

        // 3. Записываем транзакцию
        await client.query(
          `INSERT INTO transactions 
           (to_account_id, amount, currency_code, type, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [account.id, amount, currencyCode, 'credit', `Выдача кредита на сумму ${amount} ${currencyCode}`]
        );

        await client.query('COMMIT');
        
        res.status(201).json({
          message: 'Кредит одобрен',
          loan: loan.rows[0]
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Мои кредиты
  static async getMyLoans(req, res) {
    try {
      const loans = await db.query(
        `SELECT l.*, c.name as currency_name 
         FROM loans l
         JOIN currencies c ON l.currency_code = c.code
         WHERE l.user_id = $1
         ORDER BY l.issued_at DESC`,
        [req.user.id]
      );
      
      res.json(loans.rows);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = LoanController;
