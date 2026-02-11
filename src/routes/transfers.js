const express = require('express');
const TransferController = require('../controllers/transferController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, TransferController.transfer);
router.get('/history', auth, TransferController.getHistory);

module.exports = router;
