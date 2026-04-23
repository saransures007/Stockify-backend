const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    isDealer: { type: Boolean, default: false },
    totalDue: { type: Number, default: 0 },
    purchaseHistory: [
      {
        saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
        amount: Number,
        date: Date,
      },
    ],
      image: String,

  provider: {
    type: String,
    enum: ["email", "google", "apple"],
    default: "email"
  },

  providerId: String,

  // 🔥 Petpooja mapping
  petpoojaPartyId: Number,
  partyCode: String,

  // 🔥 Loyalty
  loyaltyPoints: {
    type: Number,
    default: 0
  },

  // metadata
  isActive: {
    type: Boolean,
    default: true
  },

  whatsappOptIn:{
    type: Boolean,
    default: false
  },

  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'English'
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
          lastlogin: {
            type: Date,
            default: null
        },
lastActiveAt: {
  type: Date,
  default: null
},
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },

  
  { timestamps: true }
);

// Per-tenant unique index on name
customerSchema.index({ createdBy: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Customer", customerSchema);
