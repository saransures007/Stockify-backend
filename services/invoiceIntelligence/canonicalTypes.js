// ============================================================
// CANONICAL INVOICE TYPES / CONSTANTS
//
// This project uses JavaScript + CommonJS.
//
// The purpose of this file is to define the canonical structure
// used by the invoice intelligence system.
//
// Raw invoice data can come from many different formats:
//
//   qty
//   quantity
//   invoice_quantity
//
//   rate
//   purchase_rate
//   unit_price
//
//   amount
//   total_amount
//   net_amount
//
// The rest of the application should work with ONE canonical
// structure after normalization.
// ============================================================


// ============================================================
// FIELD SOURCES
// ============================================================

const FIELD_SOURCE = Object.freeze({

  INVOICE:
    "invoice",

  PRODUCT_MASTER:
    "product_master",

  SUPPLIER_MASTER:
    "supplier_master",

  HISTORY:
    "history",

  SYSTEM:
    "system",

  USER:
    "user",

});


// ============================================================
// FIELD METHODS
// ============================================================

const FIELD_METHOD = Object.freeze({

  EXTRACTED:
    "extracted",

  CALCULATED:
    "calculated",

  INFERRED:
    "inferred",

  DEFAULTED:
    "defaulted",

  MANUAL:
    "manual",

  RESOLVED:
    "resolved",

});


// ============================================================
// CONFIDENCE LEVELS
// ============================================================

const CONFIDENCE_LEVEL = Object.freeze({

  HIGH:
    "high",

  MEDIUM:
    "medium",

  LOW:
    "low",

  MISSING:
    "missing",

});


// ============================================================
// PRICING MODES
// ============================================================
//
// exclusive_tax
//     Rate does not include GST.
//
// inclusive_tax
//     Rate already includes GST.
//
// after_discount
//     Rate represents a discounted purchase rate.
//
// unknown
//     We don't have enough information to determine it.
// ============================================================

const PRICING_MODE = Object.freeze({

  EXCLUSIVE_TAX:
    "exclusive_tax",

  INCLUSIVE_TAX:
    "inclusive_tax",

  AFTER_DISCOUNT:
    "after_discount",

  UNKNOWN:
    "unknown",

});


// ============================================================
// VALIDATION SEVERITY
// ============================================================

const VALIDATION_SEVERITY = Object.freeze({

  INFO:
    "info",

  WARNING:
    "warning",

  ERROR:
    "error",

});


// ============================================================
// VALUE RESOLVER
//
// Every canonical field can carry:
//
// value
// source
// method
// confidence
// sourceField
// reason
// warnings
// alternatives
//
// Example:
//
// {
//   value: "19053100",
//   source: "invoice",
//   method: "extracted",
//   confidence: 0.98,
//   confidenceLevel: "high",
//   sourceField: "hsn"
// }
// ============================================================

function resolvedField(
  value,
  source,
  method,
  confidence,
  options = {}
) {

  const safeConfidence =
    Number.isFinite(
      Number(confidence)
    )
      ? Number(confidence)
      : 0;


  let confidenceLevel =
    CONFIDENCE_LEVEL.MISSING;


  if (
    safeConfidence >= 0.90
  ) {

    confidenceLevel =
      CONFIDENCE_LEVEL.HIGH;

  } else if (
    safeConfidence >= 0.70
  ) {

    confidenceLevel =
      CONFIDENCE_LEVEL.MEDIUM;

  } else if (
    safeConfidence > 0
  ) {

    confidenceLevel =
      CONFIDENCE_LEVEL.LOW;

  }


  return {

    value:
      value === undefined
        ? null
        : value,

    source:
      source ||
      FIELD_SOURCE.SYSTEM,

    method:
      method ||
      FIELD_METHOD.DEFAULTED,

    confidence:
      safeConfidence,

    confidenceLevel,

    sourceField:
      options.sourceField ??
      null,

    reason:
      options.reason ??
      null,

    warnings:
      Array.isArray(
        options.warnings
      )
        ? options.warnings
        : [],

    alternatives:
      Array.isArray(
        options.alternatives
      )
        ? options.alternatives
        : [],

  };

}


// ============================================================
// VALIDATION ISSUE
// ============================================================

function validationIssue({
  code,
  field = null,
  severity =
    VALIDATION_SEVERITY.WARNING,
  message,
  expected = null,
  actual = null,
  suggestion = null,
}) {

  return {

    code,

    field,

    severity,

    message,

    expected,

    actual,

    suggestion,

  };

}


// ============================================================
// EMPTY CANONICAL PRODUCT
// ============================================================

function createEmptyCanonicalProduct() {

  return {

    name:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    code:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    hsn:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    unit:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    mrp:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    barcode:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

  };

}


// ============================================================
// EMPTY PURCHASE
// ============================================================

function createEmptyPurchase() {

  return {

    quantity:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    purchaseRate:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    discountRate:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0.90
      ),

    discountAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0.90
      ),

    taxableAmount:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

  };

}


// ============================================================
// EMPTY TAX
// ============================================================

function createEmptyTax() {

  return {

    gstRate:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    cgstRate:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    sgstRate:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    igstRate:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    gstAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    cgstAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    sgstAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    igstAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

  };

}


// ============================================================
// EMPTY TOTALS
// ============================================================

function createEmptyTotals() {

  return {

    taxableAmount:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    taxAmount:
      resolvedField(
        0,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    totalAmount:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    extractedAmount:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

  };

}


// ============================================================
// EMPTY CANONICAL LINE
// ============================================================

function createEmptyCanonicalLine(
  lineNumber = 1,
  raw = {}
) {

  return {

    id:
      `line-${lineNumber}`,

    lineNumber,

    product:
      createEmptyCanonicalProduct(),

    purchase:
      createEmptyPurchase(),

    tax:
      createEmptyTax(),

    totals:
      createEmptyTotals(),

    pricingMode:
      PRICING_MODE.UNKNOWN,

    validation: {

      valid:
        false,

      issues:
        [],

    },

    intelligence: {

      confidence:
        0,

      requiresReview:
        true,

      manuallyEditedFields:
        [],

      calculatedFields:
        [],

      extractedFields:
        [],

      inferredFields:
        [],

    },

    raw:
      raw || {},

  };

}


// ============================================================
// EMPTY CANONICAL INVOICE
// ============================================================

function createEmptyCanonicalInvoice(
  raw = {}
) {

  return {

    id:
      raw?.id ??
      null,

    invoiceNumber:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    invoiceDate:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    dueDate:
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    supplier: {

      id:
        null,

      name:
        "",

      gstin:
        null,

      invoiceFormat:
        null,

    },

    pricingMode:
      PRICING_MODE.UNKNOWN,

    lines:
      [],

    totals: {

      taxableAmount:
        0,

      taxAmount:
        0,

      totalAmount:
        0,

      discountAmount:
        0,

    },

    validation: {

      valid:
        false,

      requiresReview:
        true,

      issues:
        [],

    },

    intelligence: {

      confidence:
        0,

      sourceFormat:
        null,

      normalizedAt:
        new Date().toISOString(),

    },

    raw:
      raw || {},

  };

}


// ============================================================
// NORMALIZATION RESULT
// ============================================================

function createNormalizationStats() {

  return {

    totalLines:
      0,

    validLines:
      0,

    warningLines:
      0,

    errorLines:
      0,

    missingHsn:
      0,

    missingUnit:
      0,

    amountMismatches:
      0,

    calculatedAmounts:
      0,

    manuallyRequired:
      0,

  };

}


// ============================================================
// PRODUCT MASTER NORMALIZED SHAPE
// ============================================================

function createProductMaster(
  data = {}
) {

  return {

    id:
      data.id ??
      null,

    canonicalName:
      data.canonicalName ||
      data.name ||
      "",

    aliases:
      Array.isArray(
        data.aliases
      )
        ? data.aliases
        : [],

    hsn:
      data.hsn ??
      data.hsnCode ??
      null,

    defaultUnit:
      data.defaultUnit ??
      data.unit ??
      null,

    gstRate:
      data.gstRate ??
      null,

    mrp:
      data.mrp ??
      null,

    barcode:
      data.barcode ??
      null,

    itemCode:
      data.itemCode ??
      data.code ??
      null,

  };

}


// ============================================================
// SUPPLIER PROFILE NORMALIZED SHAPE
// ============================================================

function createSupplierProfile(
  data = {}
) {

  return {

    supplierId:
      data.supplierId ??
      data.id ??
      null,

    supplierName:
      data.supplierName ||
      data.name ||
      "",

    invoiceFormat:
      data.invoiceFormat ??
      null,

    pricingMode:
      data.pricingMode ??
      PRICING_MODE.UNKNOWN,

    fieldMappings:
      data.fieldMappings &&
      typeof data.fieldMappings === "object"
        ? data.fieldMappings
        : {},

    unitMappings:
      data.unitMappings &&
      typeof data.unitMappings === "object"
        ? data.unitMappings
        : {},

    taxRules: {

      gstIncluded:
        data?.taxRules?.gstIncluded ??
        null,

      defaultGstRate:
        data?.taxRules?.defaultGstRate ??
        null,

    },

  };

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  FIELD_SOURCE,

  FIELD_METHOD,

  CONFIDENCE_LEVEL,

  PRICING_MODE,

  VALIDATION_SEVERITY,

  resolvedField,

  validationIssue,

  createEmptyCanonicalProduct,

  createEmptyPurchase,

  createEmptyTax,

  createEmptyTotals,

  createEmptyCanonicalLine,

  createEmptyCanonicalInvoice,

  createNormalizationStats,

  createProductMaster,

  createSupplierProfile,

};