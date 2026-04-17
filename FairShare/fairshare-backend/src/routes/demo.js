const router = require('express').Router();
const controller = require('../controllers/demoController');

router.get('/state', controller.getState);
router.post('/expenses', controller.createExpense);

module.exports = router;
