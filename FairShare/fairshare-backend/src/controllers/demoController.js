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

exports.updateExpense = async (req, res, next) => {
  try {
    res.json(await demoStore.updateExpense(req.body || {}));
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    res.json(await demoStore.updateUser(req.body || {}));
  } catch (error) {
    next(error);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    res.json(await demoStore.updateGroup(req.body || {}));
  } catch (error) {
    next(error);
  }
};

exports.selectGroup = async (req, res, next) => {
  try {
    res.json(await demoStore.updateSelectedGroup(req.body?.groupId || req.params.groupId));
  } catch (error) {
    next(error);
  }
};

exports.createPaymentMethod = async (req, res, next) => {
  try {
    res.status(201).json(await demoStore.addPaymentMethod(req.body || {}));
  } catch (error) {
    next(error);
  }
};

exports.saveParticipant = async (req, res, next) => {
  try {
    res.status(req.body?.id ? 200 : 201).json(await demoStore.saveParticipant(req.body || {}));
  } catch (error) {
    next(error);
  }
};
