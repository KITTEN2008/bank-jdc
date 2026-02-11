const jwt = require('jsonwebtoken');
const db = require('../config/database');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query(
      'SELECT id, login, full_name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!user.rows[0]) {
      throw new Error();
    }

    req.user = user.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Пожалуйста, авторизуйтесь' });
  }
};
