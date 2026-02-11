module.exports = {
  CURRENCIES: {
    JDC: { name: 'Жад', rate: 150 },
    IO: { name: 'Империал', rate: 50 },
    GHY: { name: 'Расфер', rate: 12 },
    RUB: { name: 'Рубль', rate: 1 }
  },
  
  CREDIT: {
    MAX_AMOUNT: 100000,      // Максимальная сумма кредита
    MIN_AMOUNT: 1000,        // Минимальная сумма
    BASE_RATE: 10,           // 10% годовых
    MAX_TERM_DAYS: 365       // Макс срок
  },
  
  JWT: {
    EXPIRES_IN: '7d'
  }
};
