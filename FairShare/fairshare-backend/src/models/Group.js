const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  image: String,
  currency: { type: String, default: 'INR' },
  type: { type: String, enum: ['trip', 'apartment', 'dinner', 'other'], default: 'other' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  totalSpend: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
