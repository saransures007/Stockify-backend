// models/ProductRequest.js

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  userEmail: {
    type: String,
    lowercase: true,
    sparse: true
  },
  deviceId: {
    type: String,
    sparse: true
  },
  userIp: String,
  votedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const productRequestSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  originalName: {
    type: String,
    required: true,
    trim: true
  },

  normalizedName: {
    type: String,
    index: true
  },

  category: String,
  brand: String,
  description: String, // ✅ added

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'stock_added'],
    default: 'pending'
  },

  votes: [voteSchema],

  voteCount: {
    type: Number,
    default: 0,
    index: true
  },

  requestedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userEmail: String,
    userIp: String,
    userName: String
  }

}, { timestamps: true });

/* ---------------- INDEXES ---------------- */

// ❌ REMOVE strict unique (we handle in service)
// productRequestSchema.index({ normalizedName: 1 }, { unique: true });

productRequestSchema.index({ normalizedName: 1 });

productRequestSchema.index({
  productName: "text",
  originalName: "text"
});

/* ---------------- HOOKS ---------------- */

productRequestSchema.pre('save', function(next) {
  this.voteCount = this.votes.length;
  next();
});

/* ---------------- METHODS ---------------- */

productRequestSchema.methods.hasUserVoted = function({ userId, deviceId }) {
  return this.votes.some(v =>
    (userId && v.userId?.toString() === userId.toString()) ||
    (deviceId && v.deviceId === deviceId)
  );
};

/* ---------------- STATIC HELPERS (🔥 NEW) ---------------- */

productRequestSchema.statics.findExisting = function(normalizedName) {
  return this.findOne({ normalizedName });
};

module.exports = mongoose.model('ProductRequest', productRequestSchema);