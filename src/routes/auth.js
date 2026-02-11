const express = require('express');
const AuthController = require('../controllers/authController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', auth, AuthController.getMe);

module.exports = router;
