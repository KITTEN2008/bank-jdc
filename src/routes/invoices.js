
const express = require('express');
const InvoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, InvoiceController.createInvoice);
router.get('/pending', auth, InvoiceController.getPendingInvoices);
router.post('/:id/pay', auth, InvoiceController.payInvoice);

module.exports = router;
