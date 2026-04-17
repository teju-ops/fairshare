const router = require('express').Router();
const controller = require('../controllers/demoController');

router.get('/state', controller.getState);
router.post('/expenses', controller.createExpense);
router.patch('/expenses', controller.updateExpense);
router.patch('/user', controller.updateUser);
router.patch('/groups', controller.updateGroup);
router.patch('/groups/select/:groupId', controller.selectGroup);
router.post('/payment-methods', controller.createPaymentMethod);
router.post('/participants', controller.saveParticipant);
router.patch('/participants', controller.saveParticipant);

module.exports = router;
