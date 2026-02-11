const db = require('../config/database');
const AccountService = require('../services/accountService');
const CurrencyService = require('../services/currencyService');

class InvoiceController {
  // Выставить счёт
  static async createInvoice(req, res) {
    const { payerLogin, amount, currencyCode, description } = req.body;
    
    try {
      // 1. Найти получателя платежа (payer)
      const payer = await db.query(
        'SELECT id FROM users WHERE login = $1',
        [payerLogin]
      );
      
      if (!payer.rows[0]) {
        throw new Error('Пользователь не найден');
      }

      // 2. Найти счёт отправителя (куда зачислять деньги)
      const issuerAccount = await AccountService.getUserAccount(req.user.id, currencyCode);
      if (!issuerAccount) {
        throw new Error('Счёт для зачисления не найден');
      }

      // 3. Создать счёт
      const invoice = await db.query(
        `INSERT INTO invoices 
         (issuer_id, payer_id, account_id, amount, currency_code, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.user.id, payer.rows[0].id, issuerAccount.id, amount, currencyCode, description]
      );

      res.status(201).json({
        message: 'Счёт выставлен',
        invoice: invoice.rows[0]
      });
      
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Оплатить счёт
  static async payInvoice(req, res) {
    const { id } = req.params;
    const { fromCurrencyCode } = req.body; // Валюта, которой платит пользователь
    
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Получить счёт
      const invoice = await client.query(
        'SELECT * FROM invoices WHERE id = $1 AND status = $2',
        [id, 'pending']
      );
      
      if (!invoice.rows[0]) {
        throw new Error('Счёт не найден или уже оплачен');
      }

      // 2. Проверить, что плательщик - текущий пользователь
      if (invoice.rows[0].payer_id !== req.user.id) {
        throw new Error('Этот счёт выставлен не вам');
      }

      // 3. Найти счёт плательщика
      const payerAccount = await AccountService.getUserAccount(req.user.id, fromCurrencyCode);
      if (!payerAccount) {
        throw new Error('У вас нет счёта в этой валюте');
      }

      // 4. Конвертировать сумму
      let amountToDebit = invoice.rows[0].amount;
      if (fromCurrencyCode !== invoice.rows[0].currency_code) {
        amountToDebit = CurrencyService.convert(
          invoice.rows[0].amount,
          invoice.rows[0].currency_code,
          fromCurrencyCode
        );
      }

      // 5. Проверить баланс
      if (payerAccount.balance < amountToDebit) {
        throw new Error('Недостаточно средств');
      }

      // 6. Списать у плательщика
      const newPayerBalance = parseFloat(payerAccount.balance) - parseFloat(amountToDebit);
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [newPayerBalance, payerAccount.id]
      );

      // 7. Зачислить получателю
      const issuerAccount = await client.query(
        'SELECT * FROM accounts WHERE id = $1',
        [invoice.rows[0].account_id]
      );
      
      const newIssuerBalance = parseFloat(issuerAccount.rows[0].balance) + parseFloat(invoice.rows[0].amount);
      await client.query(
        'UPDATE accounts SET balance = $1 WHERE id = $2',
        [newIssuerBalance, invoice.rows[0].account_id]
      );

      // 8. Обновить статус счёта
      await client.query(
        `UPDATE invoices 
         SET status = 'paid', paid_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      // 9. Записать транзакцию
      await client.query(
        `INSERT INTO transactions 
         (from_account_id, to_account_id, amount, currency_code, 
          converted_amount, converted_currency_code, type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          payerAccount.id,
          invoice.rows[0].account_id,
          amountToDebit,
          fromCurrencyCode,
          invoice.rows[0].amount,
          invoice.rows[0].currency_code,
          'invoice',
          `Оплата счёта #${id}`
        ]
      );

      await client.query('COMMIT');
      
      res.json({
        message: 'Счёт оплачен'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  // Получить входящие счета
  static async getPendingInvoices(req, res) {
    try {
      const invoices = await db.query(
        `SELECT i.*, 
          u.full_name as issuer_name,
          c.name as currency_name
         FROM invoices i
         JOIN users u ON i.issuer_id = u.id
         JOIN currencies c ON i.currency_code = c.code
         WHERE i.payer_id = $1 AND i.status = 'pending'
         ORDER BY i.created_at DESC`,
        [req.user.id]
      );
      
      res.json(invoices.rows);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = InvoiceController;
