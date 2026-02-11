const { CURRENCIES } = require('../config/constants');

class CurrencyService {
  // Конвертация суммы из одной валюты в другую
  static convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = CURRENCIES[fromCurrency]?.rate;
    const toRate = CURRENCIES[toCurrency]?.rate;
    
    if (!fromRate || !toRate) {
      throw new Error('Неверная валюта');
    }
    
    // Сумма в рублях, затем в целевую валюту
    const inRub = amount * fromRate;
    return inRub / toRate;
  }

  // Получить курс относительно рубля
  static getRate(currencyCode) {
    return CURRENCIES[currencyCode]?.rate;
  }

  // Все валюты
  static getAll() {
    return CURRENCIES;
  }
}

module.exports = CurrencyService;
