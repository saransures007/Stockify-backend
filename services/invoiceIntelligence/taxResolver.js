// ============================================================
// INVOICE TAX RESOLVER
// ============================================================
//
// Responsibility:
//
//   Resolve:
//     GST %
//     CGST %
//     SGST %
//     IGST %
//     GST Amount
//     CGST Amount
//     SGST Amount
//     IGST Amount
//
// This file does NOT calculate invoice totals.
// Amount calculation remains in amountResolver.js.
//
// ============================================================

const {
  FIELD_SOURCE,
  FIELD_METHOD,
  resolvedField,
} = require("./canonicalTypes");

const {
  getMappedValue,
  toNumber,
} = require("./fieldResolver");


// ============================================================
// INTERNAL RESOLVED FIELD HELPER
// ============================================================

function makeResolved(
  value,
  source,
  method,
  confidence,
  options = {}
) {
  return resolvedField(
    value,
    source,
    method,
    confidence,
    {
      sourceField:
        options.sourceField ?? null,

      reason:
        options.reason ?? null,

      warnings:
        Array.isArray(options.warnings)
          ? options.warnings
          : [],

      alternatives:
        Array.isArray(options.alternatives)
          ? options.alternatives
          : [],
    }
  );
}


// ============================================================
// SAFE NUMBER
// ============================================================

function numberOrNull(value) {
  const number =
    toNumber(value);

  if (
    number === null ||
    !Number.isFinite(number)
  ) {
    return null;
  }

  return number;
}


// ============================================================
// SAFE NUMBER ZERO
// ============================================================

function numberOrZero(value) {
  const number =
    numberOrNull(value);

  return number === null
    ? 0
    : number;
}


// ============================================================
// ROUND
// ============================================================

function roundMoney(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.round(
    (
      number +
      Number.EPSILON
    ) * 100
  ) / 100;
}


// ============================================================
// GST RATE
// ============================================================

function resolveGSTRate(
  raw,
  productMaster = null,
  supplier = null
) {

  // ----------------------------------------------------------
  // 1. DIRECT GST
  // ----------------------------------------------------------

  const gstField =
    getMappedValue(
      raw,
      "gstRate",
      supplier
    );

  const directGST =
    numberOrNull(
      gstField?.value
    );

  if (
    directGST !== null &&
    directGST >= 0
  ) {

    return makeResolved(
      directGST,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {
        sourceField:
          gstField.sourceField,

        reason:
          "GST rate directly extracted from invoice",
      }
    );
  }


  // ----------------------------------------------------------
  // 2. CGST + SGST
  // ----------------------------------------------------------

  const cgstField =
    getMappedValue(
      raw,
      "cgstRate",
      supplier
    );

  const sgstField =
    getMappedValue(
      raw,
      "sgstRate",
      supplier
    );

  const cgst =
    numberOrNull(
      cgstField?.value
    );

  const sgst =
    numberOrNull(
      sgstField?.value
    );


  if (
    cgst !== null ||
    sgst !== null
  ) {

    const total =
      (
        cgst || 0
      ) +
      (
        sgst || 0
      );

    return makeResolved(
      total,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.CALCULATED,
      0.95,
      {
        reason:
          "GST calculated from CGST + SGST",
      }
    );
  }


  // ----------------------------------------------------------
  // 3. IGST
  // ----------------------------------------------------------

  const igstField =
    getMappedValue(
      raw,
      "igstRate",
      supplier
    );

  const igst =
    numberOrNull(
      igstField?.value
    );

  if (
    igst !== null &&
    igst >= 0
  ) {

    return makeResolved(
      igst,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.95,
      {
        sourceField:
          igstField.sourceField,

        reason:
          "GST rate resolved from IGST",
      }
    );
  }


  // ----------------------------------------------------------
  // 4. PRODUCT MASTER
  // ----------------------------------------------------------

  const masterGST =
    numberOrNull(
      productMaster?.gstRate ??
      productMaster?.gst_rate ??
      productMaster?.gstPercentage ??
      productMaster?.gst_percentage
    );

  if (
    masterGST !== null &&
    masterGST >= 0
  ) {

    return makeResolved(
      masterGST,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.90,
      {
        reason:
          "GST rate resolved from product master",
      }
    );
  }


  // ----------------------------------------------------------
  // 5. SUPPLIER DEFAULT
  // ----------------------------------------------------------

  const supplierGST =
    numberOrNull(
      supplier
        ?.taxRules
        ?.defaultGstRate ??
      supplier
        ?.taxRules
        ?.defaultGST ??
      supplier
        ?.defaultGstRate ??
      supplier
        ?.gstRate
    );

  if (
    supplierGST !== null &&
    supplierGST >= 0
  ) {

    return makeResolved(
      supplierGST,
      FIELD_SOURCE.SUPPLIER_MASTER,
      FIELD_METHOD.DEFAULTED,
      0.70,
      {
        reason:
          "GST rate resolved from supplier default",
      }
    );
  }


  // ----------------------------------------------------------
  // 6. UNKNOWN
  // ----------------------------------------------------------

  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {
      reason:
        "GST rate unavailable; defaulted to zero",
    }
  );
}


// ============================================================
// CGST RATE
// ============================================================

function resolveCGSTRate(
  raw,
  supplier = null
) {

  const field =
    getMappedValue(
      raw,
      "cgstRate",
      supplier
    );

  const value =
    numberOrNull(
      field?.value
    );

  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {
        sourceField:
          field.sourceField,

        reason:
          "CGST rate extracted from invoice",
      }
    );
  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {
      reason:
        "CGST rate unavailable",
    }
  );
}


// ============================================================
// SGST RATE
// ============================================================

function resolveSGSTRate(
  raw,
  supplier = null
) {

  const field =
    getMappedValue(
      raw,
      "sgstRate",
      supplier
    );

  const value =
    numberOrNull(
      field?.value
    );

  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {
        sourceField:
          field.sourceField,

        reason:
          "SGST rate extracted from invoice",
      }
    );
  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {
      reason:
        "SGST rate unavailable",
    }
  );
}


// ============================================================
// IGST RATE
// ============================================================

function resolveIGSTRate(
  raw,
  supplier = null
) {

  const field =
    getMappedValue(
      raw,
      "igstRate",
      supplier
    );

  const value =
    numberOrNull(
      field?.value
    );

  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {
        sourceField:
          field.sourceField,

        reason:
          "IGST rate extracted from invoice",
      }
    );
  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {
      reason:
        "IGST rate unavailable",
    }
  );
}


// ============================================================
// RESOLVE ALL TAX RATES
// ============================================================

function resolveTax(
  raw,
  productMaster = null,
  supplier = null
) {

  const gstRate =
    resolveGSTRate(
      raw,
      productMaster,
      supplier
    );


  const cgstRate =
    resolveCGSTRate(
      raw,
      supplier
    );


  const sgstRate =
    resolveSGSTRate(
      raw,
      supplier
    );


  const igstRate =
    resolveIGSTRate(
      raw,
      supplier
    );


  return {

    gstRate,

    cgstRate,

    sgstRate,

    igstRate,

  };
}


// ============================================================
// TAX AMOUNT RESOLUTION
// ============================================================
//
// Amounts are calculated from the canonical taxable amount.
//
// taxableAmount × rate / 100
//
// ============================================================

function resolveTaxAmounts(
  taxableAmount,
  tax
) {

  const taxable =
    numberOrZero(
      taxableAmount
    );


  const gst =
    numberOrZero(
      tax?.gstRate
    );


  const cgst =
    numberOrZero(
      tax?.cgstRate
    );


  const sgst =
    numberOrZero(
      tax?.sgstRate
    );


  const igst =
    numberOrZero(
      tax?.igstRate
    );


  const cgstAmount =
    roundMoney(
      taxable *
      cgst /
      100
    );


  const sgstAmount =
    roundMoney(
      taxable *
      sgst /
      100
    );


  const igstAmount =
    roundMoney(
      taxable *
      igst /
      100
    );


  let gstAmount =
    roundMoney(
      taxable *
      gst /
      100
    );


  // ----------------------------------------------------------
  // If GST is not available but CGST/SGST exists,
  // use the components.
  // ----------------------------------------------------------

  if (
    gst === 0 &&
    (
      cgst > 0 ||
      sgst > 0
    )
  ) {

    gstAmount =
      roundMoney(
        cgstAmount +
        sgstAmount
      );

  }


  // ----------------------------------------------------------
  // If IGST exists and GST is zero, use IGST.
  // ----------------------------------------------------------

  if (
    gst === 0 &&
    igst > 0
  ) {

    gstAmount =
      igstAmount;

  }


  return {

    gstAmount,

    cgstAmount,

    sgstAmount,

    igstAmount,

  };
}


// ============================================================
// RESOLVE LINE TAX
// ============================================================
//
// This is the function invoiceNormalizer.js uses.
//
// ============================================================

function resolveLineTax(
  raw,
  options = {}
) {

  const source =
    raw || {};


  const canonicalLine =
    options.canonicalLine ||
    {};


  const productMaster =
    options.productMaster ||
    canonicalLine
      ?.product
      ?.master ||
    null;


  const supplier =
    options.supplier ||
    null;


  // ----------------------------------------------------------
  // RESOLVE RATES
  // ----------------------------------------------------------

  const rates =
    resolveTax(
      source,
      productMaster,
      supplier
    );


  // ----------------------------------------------------------
  // TAXABLE AMOUNT
  // ----------------------------------------------------------

  const taxableAmount =
    canonicalLine
      ?.purchase
      ?.taxableAmount
      ?.value ??
    canonicalLine
      ?.totals
      ?.taxableAmount
      ?.value ??
    source
      ?.taxableAmount;


  // ----------------------------------------------------------
  // TAX AMOUNTS
  // ----------------------------------------------------------

  const amounts =
    resolveTaxAmounts(
      taxableAmount,
      rates
    );


  return {

    gstRate:
      rates.gstRate,

    cgstRate:
      rates.cgstRate,

    sgstRate:
      rates.sgstRate,

    igstRate:
      rates.igstRate,

    gstAmount:
      makeResolved(
        amounts.gstAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        0.98,
        {
          reason:
            "GST amount calculated from taxable amount and GST rate",
        }
      ),

    cgstAmount:
      makeResolved(
        amounts.cgstAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        0.98,
        {
          reason:
            "CGST amount calculated from taxable amount and CGST rate",
        }
      ),

    sgstAmount:
      makeResolved(
        amounts.sgstAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        0.98,
        {
          reason:
            "SGST amount calculated from taxable amount and SGST rate",
        }
      ),

    igstAmount:
      makeResolved(
        amounts.igstAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        0.98,
        {
          reason:
            "IGST amount calculated from taxable amount and IGST rate",
        }
      ),

  };
}


// ============================================================
// RESOLVE TAX FROM CANONICAL LINE
// ============================================================

function resolveCanonicalTax(
  canonicalLine,
  options = {}
) {

  return resolveLineTax(
    {},
    {
      ...options,

      canonicalLine,
    }
  );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  makeResolved,

  numberOrNull,

  numberOrZero,

  roundMoney,

  resolveGSTRate,

  resolveCGSTRate,

  resolveSGSTRate,

  resolveIGSTRate,

  resolveTax,

  resolveTaxAmounts,

  resolveLineTax,

  resolveCanonicalTax,

};