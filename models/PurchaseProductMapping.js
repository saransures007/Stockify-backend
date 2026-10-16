const mongoose = require("mongoose");

const PurchaseProductMappingSchema =
  new mongoose.Schema(
    {
      supplierId: {
        type: Number,
        required: true,
      },

      supplierPartyCode: {
        type: String,
        required: true,
        trim: true,
      },

      invoiceName: {
        type: String,
        required: true,
        trim: true,
      },

      invoiceNameNormalized: {
        type: String,
        required: true,
        trim: true,
      },

      petpoojaItems: {
        type: [
          {
            petpoojaItemId: {
              type: Number,
              required: true,
            },

            itemCode: {
              type: String,
              default: "",
            },

            itemName: {
              type: String,
              default: "",
            },
          },
        ],

        default: [],
      },
    },

    {
      timestamps: true,
    }
  );


// ==========================================================
// UNIQUE MAPPING
//
// One supplier + one invoice product name = one mapping
// ==========================================================

PurchaseProductMappingSchema.index(
  {
    supplierId: 1,
    invoiceNameNormalized: 1,
  },
  {
    unique: true,
  }
);


module.exports =
  mongoose.model(
    "PurchaseProductMapping",
    PurchaseProductMappingSchema
  );