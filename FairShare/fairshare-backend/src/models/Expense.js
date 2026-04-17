const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  percentage: Number,
  isPaid: { type: Boolean, default: false },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  category: { type: String, enum: ['food', 'travel', 'accommodation', 'fun', 'utilities', 'other'], default: 'other' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  splitStrategy: { type: String, enum: ['equal', 'percentage', 'custom', 'weight'], default: 'equal' },
  splits: [splitSchema],
  receiptUrl: { type: String, default: null },
  ocrStatus: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: null },
  parsedReceiptData: {
    detectedTotal: Number,
    items: [{ name: String, price: Number, quantity: Number }],
    date: Date,
    rawText: String,
  },
  date: { type: Date, default: Date.now },
  tags: [String],
}, { timestamps: true });

expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ paidBy: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
