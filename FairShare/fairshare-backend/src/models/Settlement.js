const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  upiLink: String,
  note: String,
  settledAt: Date,
}, { timestamps: true });

settlementSchema.index({ from: 1, status: 1 });
settlementSchema.index({ to: 1, status: 1 });
settlementSchema.index({ group: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
