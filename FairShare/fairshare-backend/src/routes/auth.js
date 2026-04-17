const router = require('express').Router();
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);

module.exports = router;
