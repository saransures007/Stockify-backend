// ============================================================
// PURCHASE EXTRACTION SERVICE
// ============================================================
//
// Input:
//   Already extracted invoice JSON
//
// Output:
//   Canonical invoice
//   Purchase Review data
//
// NO PDF
// NO OCR
// NO FILE PROCESSING
//
// ============================================================

const invoiceIntelligence =
  require("./invoiceIntelligence");


// ============================================================
// PROCESS INVOICE DATA
// ============================================================
//
// This is the main function.
//
// Pass your existing invoice data directly:
//
// const result = processInvoice(invoiceData);
//
// ============================================================

function processInvoice(
  invoiceData,
  options = {}
) {

  if (
    !invoiceData ||
    typeof invoiceData !== "object"
  ) {

    throw new Error(
      "Invoice data is required"
    );

  }


  // ----------------------------------------------------------
  // 1. NORMALIZE
  // ----------------------------------------------------------

  const canonicalResult =
    invoiceIntelligence.normalizeInvoice(
      invoiceData,
      {

        supplier:
          options.supplier ||
          null,

        productMasters:
          Array.isArray(
            options.productMasters
          )
            ? options.productMasters
            : [],

        historicalProducts:
          Array.isArray(
            options.historicalProducts
          )
            ? options.historicalProducts
            : [],

        tolerance:
          options.tolerance,

      }
    );


  // ----------------------------------------------------------
  // 2. MAP FOR PURCHASE REVIEW
  // ----------------------------------------------------------

  const purchaseReview =
    invoiceIntelligence.mapCanonicalInvoice(
      canonicalResult.canonical
    );


  // ----------------------------------------------------------
  // 3. RETURN
  // ----------------------------------------------------------

  return {

    success:
      true,

    canonical:
      canonicalResult.canonical,

    purchaseReview,

    stats:
      canonicalResult.stats,

  };

}


// ============================================================
// PROCESS RAW INVOICE
// ============================================================
//
// Alias for processInvoice.
//
// Useful because your existing code may already call
// processRawInvoice().
//
// ============================================================

function processRawInvoice(
  invoiceData,
  options = {}
) {

  return processInvoice(
    invoiceData,
    options
  );

}


// ============================================================
// UPDATE SINGLE LINE
// ============================================================
//
// Example:
//
// updateLine(
//   canonical,
//   0,
//   {
//     hsn: "17049020",
//     unit: "UNT",
//     quantity: 10,
//     purchaseRate: 180
//   }
// );
//
// ============================================================

function updateLine(
  canonicalInvoice,
  lineIndex,
  changes,
  options = {}
) {

  if (
    !canonicalInvoice
  ) {

    throw new Error(
      "Canonical invoice is required"
    );

  }


  const result =
    invoiceIntelligence.applyLineEdit(
      canonicalInvoice,
      Number(lineIndex),
      changes,
      options
    );


  return {

    success:
      true,

    canonical:
      result,

    purchaseReview:
      invoiceIntelligence.mapCanonicalInvoice(
        result
      ),

  };

}


// ============================================================
// BULK UPDATE
// ============================================================
//
// Example:
//
// updateBulk(
//   canonical,
//   [0, 1, 3],
//   "hsn",
//   "17049020"
// );
//
// ============================================================

function updateBulk(
  canonicalInvoice,
  lineIndexes,
  field,
  value
) {

  if (
    !canonicalInvoice
  ) {

    throw new Error(
      "Canonical invoice is required"
    );

  }


  const result =
    invoiceIntelligence.applyBulkEdit(
      canonicalInvoice,
      lineIndexes,
      field,
      value
    );


  return {

    success:
      true,

    canonical:
      result,

    purchaseReview:
      invoiceIntelligence.mapCanonicalInvoice(
        result
      ),

  };

}


// ============================================================
// VALIDATE
// ============================================================

function validate(
  canonicalInvoice
) {

  return invoiceIntelligence.validateInvoice(
    canonicalInvoice
  );

}


// ============================================================
// PURCHASE REVIEW
// ============================================================

function getPurchaseReview(
  canonicalInvoice
) {

  if (
    !canonicalInvoice
  ) {

    throw new Error(
      "Canonical invoice is required"
    );

  }


  return invoiceIntelligence.mapCanonicalInvoice(
    canonicalInvoice
  );

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  processInvoice,

  processRawInvoice,

  updateLine,

  updateBulk,

  validate,

  getPurchaseReview,

};