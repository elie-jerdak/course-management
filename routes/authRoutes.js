const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/login', (req, res) => {res.render('auth/login');});
router.get('/register', (req, res) => {res.render('auth/register');});

module.exports = router;