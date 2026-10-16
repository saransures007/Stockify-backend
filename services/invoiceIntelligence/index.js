// ============================================================
// INVOICE INTELLIGENCE
// ============================================================
//
// Public entry point for the complete Invoice Intelligence
// system.
//
// RAW INVOICE
//     ↓
// invoiceNormalizer
//     ↓
// Canonical Invoice
//     ↓
// canonicalMapper
//     ↓
// Frontend Review Model
//
// This module contains NO:
//   - Petpooja API calls
//   - database operations
//   - purchase bill creation
//   - UI logic
//
// ============================================================


// ============================================================
// CORE MODULES
// ============================================================

const canonicalTypes =
  require("./canonicalTypes");

const fieldResolver =
  require("./fieldResolver");

const productResolver =
  require("./productResolver");

const taxResolver =
  require("./taxResolver");

const amountResolver =
  require("./amountResolver");

const invoiceNormalizer =
  require("./invoiceNormalizer");

const invoiceValidator =
  require("./invoiceValidator");

const canonicalMapper =
  require("./canonicalMapper");


// ============================================================
// NORMALIZE SINGLE INVOICE
// ============================================================
//
// Main production API.
//
// rawInvoice:
//   Original invoice data received from Petpooja/source.
//
// options:
//   {
//     supplier,
//     productMaster,
//     productMasters,
//     historicalProduct,
//     historicalProducts,
//     tolerance
//   }
//
// Returns:
//   {
//     success,
//     canonical,
//     stats,
//     amountResults,
//     validation
//   }
//
// ============================================================

function normalizeInvoice(
  rawInvoice,
  options = {}
) {

  return invoiceNormalizer
    .normalizeInvoice(
      rawInvoice,
      options
    );

}


// ============================================================
// NORMALIZE MULTIPLE INVOICES
// ============================================================

function normalizeInvoices(
  invoices = [],
  options = {}
) {

  return invoiceNormalizer
    .normalizeInvoices(
      invoices,
      options
    );

}


// ============================================================
// NORMALIZE SINGLE RAW LINE
// ============================================================
//
// This is a TEST / UTILITY API.
//
// It should NOT be used as the main invoice workflow.
//
// Useful for debugging one invoice item.
//
// ============================================================

function normalizeLine(
  rawLine,
  options = {}
) {

  if (
    !rawLine ||
    typeof rawLine !== "object"
  ) {

    throw new Error(
      "rawLine must be an object"
    );

  }


  return invoiceNormalizer
    .buildCanonicalLine(
      rawLine,
      options.index || 0,
      options
    );

}


// ============================================================
// VALIDATE CANONICAL INVOICE
// ============================================================
//
// Use this when the frontend sends a manually edited canonical
// invoice back to the backend.
//
// ============================================================

function validateInvoice(
  canonicalInvoice,
  options = {}
) {

  return invoiceValidator
    .validateInvoice(
      canonicalInvoice,
      options
    );

}


// ============================================================
// VALIDATE ONE CANONICAL LINE
// ============================================================

function validateLine(
  canonicalLine,
  index = 0,
  options = {}
) {

  return invoiceValidator
    .validateLine(
      canonicalLine,
      index,
      options
    );

}


// ============================================================
// MAP CANONICAL INVOICE FOR REVIEW
// ============================================================
//
// Canonical model
//      ↓
// Frontend review model
//
// ============================================================

function mapForReview(
  canonicalInvoice
) {

  return canonicalMapper
    .mapCanonicalInvoice(
      canonicalInvoice
    );

}


// ============================================================
// GET REVIEW ROWS
// ============================================================
//
// Lightweight frontend representation.
//
// ============================================================

function getReviewRows(
  canonicalInvoice
) {

  const mapped =
    mapForReview(
      canonicalInvoice
    );


  return mapped?.lines || [];
}


// ============================================================
// APPLY SINGLE LINE EDIT
// ============================================================
//
// Example:
//
// applyLineEdit(
//   canonicalInvoice,
//   0,
//   {
//     product: {
//       hsn: "0901",
//       unit: "PCS",
//       mrp: 200
//     },
//     purchase: {
//       quantity: 10,
//       purchaseRate: 180
//     },
//     tax: {
//       gstRate: 18
//     }
//   }
// )
//
// ============================================================

function applyLineEdit(
  canonicalInvoice,
  lineIndex,
  changes,
  options = {}
) {

  return canonicalMapper
    .applyLineEdit(
      canonicalInvoice,
      lineIndex,
      changes,
      options
    );

}


// ============================================================
// APPLY BULK EDIT
// ============================================================
//
// Example:
//
// applyBulkEdit(
//   invoice,
//   [0, 1, 2],
//   "product.hsn",
//   "0901"
// )
//
// ============================================================

function applyBulkEdit(
  canonicalInvoice,
  lineIndexes,
  fieldPath,
  value
) {

  return canonicalMapper
    .applyBulkEdit(
      canonicalInvoice,
      lineIndexes,
      fieldPath,
      value
    );

}


// ============================================================
// BULK HSN
// ============================================================

function applyBulkHsn(
  canonicalInvoice,
  lineIndexes,
  hsn
) {

  return canonicalMapper
    .applyBulkHsn(
      canonicalInvoice,
      lineIndexes,
      hsn
    );

}


// ============================================================
// BULK UNIT
// ============================================================

function applyBulkUnit(
  canonicalInvoice,
  lineIndexes,
  unit
) {

  return canonicalMapper
    .applyBulkUnit(
      canonicalInvoice,
      lineIndexes,
      unit
    );

}


// ============================================================
// BULK GST
// ============================================================

function applyBulkGst(
  canonicalInvoice,
  lineIndexes,
  gstRate
) {

  return canonicalMapper
    .applyBulkGst(
      canonicalInvoice,
      lineIndexes,
      gstRate
    );

}


// ============================================================
// BULK PURCHASE RATE
// ============================================================

function applyBulkPurchaseRate(
  canonicalInvoice,
  lineIndexes,
  purchaseRate
) {

  return canonicalMapper
    .applyBulkPurchaseRate(
      canonicalInvoice,
      lineIndexes,
      purchaseRate
    );

}


// ============================================================
// BULK MRP
// ============================================================

function applyBulkMrp(
  canonicalInvoice,
  lineIndexes,
  mrp
) {

  return canonicalMapper
    .applyBulkMrp(
      canonicalInvoice,
      lineIndexes,
      mrp
    );

}


// ============================================================
// BULK QUANTITY
// ============================================================

function applyBulkQuantity(
  canonicalInvoice,
  lineIndexes,
  quantity
) {

  return canonicalMapper
    .applyBulkQuantity(
      canonicalInvoice,
      lineIndexes,
      quantity
    );

}


// ============================================================
// BULK DISCOUNT
// ============================================================

function applyBulkDiscount(
  canonicalInvoice,
  lineIndexes,
  discountRate
) {

  return canonicalMapper
    .applyBulkDiscount(
      canonicalInvoice,
      lineIndexes,
      discountRate
    );

}


// ============================================================
// REVIEW SUMMARY
// ============================================================

function getReviewSummary(
  canonicalInvoice
) {

  return canonicalMapper
    .getReviewSummary(
      canonicalInvoice
    );

}


// ============================================================
// LOW LEVEL RESOLVERS
// ============================================================
//
// Exporting these is useful for unit tests/debugging.
//
// Production code should normally use:
//
// normalizeInvoice()
//
// instead of calling individual resolvers.
//
// ============================================================

module.exports = {

  // ----------------------------------------------------------
  // Canonical types
  // ----------------------------------------------------------

  ...canonicalTypes,


  // ----------------------------------------------------------
  // Field resolver
  // ----------------------------------------------------------

  ...fieldResolver,


  // ----------------------------------------------------------
  // Product resolver
  // ----------------------------------------------------------

  ...productResolver,


  // ----------------------------------------------------------
  // Tax resolver
  // ----------------------------------------------------------

  ...taxResolver,


  // ----------------------------------------------------------
  // Amount resolver
  // ----------------------------------------------------------

  ...amountResolver,


  // ----------------------------------------------------------
  // Invoice normalizer
  // ----------------------------------------------------------

  ...invoiceNormalizer,


  // ----------------------------------------------------------
  // Validator
  // ----------------------------------------------------------

  ...invoiceValidator,


  // ----------------------------------------------------------
  // Mapper
  // ----------------------------------------------------------

  ...canonicalMapper,


  // ----------------------------------------------------------
  // Main public APIs
  // ----------------------------------------------------------

  normalizeInvoice,

  normalizeInvoices,

  normalizeLine,

  validateInvoice,

  validateLine,

  mapForReview,

  getReviewRows,

  applyLineEdit,

  applyBulkEdit,

  applyBulkHsn,

  applyBulkUnit,

  applyBulkGst,

  applyBulkPurchaseRate,

  applyBulkMrp,

  applyBulkQuantity,

  applyBulkDiscount,

  getReviewSummary,

};