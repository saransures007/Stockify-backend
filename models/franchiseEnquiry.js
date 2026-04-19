const mongoose = require("mongoose");

const franchiseEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, required: true },
    city: { type: String, required: true },
    investment: { type: String },
    description: { type: String },

    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

const FranchiseEnquiry = mongoose.model(
  "FranchiseEnquiry",
  franchiseEnquirySchema
);

module.exports = FranchiseEnquiry;