const express = require('express');
const LoanController = require('../controllers/loanController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, LoanController.requestLoan);
router.get('/', auth, LoanController.getMyLoans);

module.exports = router;
