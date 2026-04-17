const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const msg = error.details.map(d => d.message).join(', ');
    return res.status(400).json({ error: msg });
  }
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    upiId: Joi.string().optional(),
    currency: Joi.string().default('INR'),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  createGroup: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().optional(),
    currency: Joi.string().default('INR'),
    type: Joi.string().valid('trip', 'apartment', 'dinner', 'other').default('other'),
  }),
  createExpense: Joi.object({
    description: Joi.string().required(),
    amount: Joi.number().positive().required(),
  }),
};

module.exports = { validate, schemas };
