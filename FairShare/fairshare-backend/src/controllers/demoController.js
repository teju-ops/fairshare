const demoStore = require('../data/demoStore');

exports.getState = async (_req, res, next) => {
  try {
    res.json(await demoStore.getState());
  } catch (error) {
    next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const result = await demoStore.addExpense(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
