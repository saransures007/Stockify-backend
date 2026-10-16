// ============================================================
// INTELLIGENT INVOICE AMOUNT RESOLVER
// ============================================================
//
// Purpose:
//
// Different suppliers may call the same value:
//
//   amount
//   net amount
//   taxable amount
//   total amount
//   gross amount
//   line total
//
// We must NOT blindly trust the field name.
//
// This resolver calculates the expected values from:
//
//   Quantity
//   Purchase Rate
//   Discount
//   GST
//
// and compares them with the values extracted from the invoice.
//
// Canonical flow:
//
//   Qty × Purchase Rate
//          ↓
//      Discount
//          ↓
//    Taxable Amount
//          ↓
//        GST
//          ↓
//     Total Amount
//
// The UI can then show:
//
//   ✓ Matched
//   ⚠ Amount mismatch
//   ⚠ Invoice amount appears to be net amount
//   ⚠ Invoice amount appears to include GST
//
// ============================================================

const {
  FIELD_SOURCE,
  FIELD_METHOD,
  PRICING_MODE,
  resolvedField,
  validationIssue,
  VALIDATION_SEVERITY,
} = require("./canonicalTypes");


// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_TOLERANCE = 0.05;

const PERCENT_TOLERANCE = 0.001;


// ============================================================
// NUMBER HELPERS
// ============================================================

function numberOrZero(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function nullableNumber(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


// ============================================================
// ROUNDING
// ============================================================

function roundMoney(
  value,
  decimals = 2
) {

  const number =
    numberOrZero(value);

  const factor =
    Math.pow(
      10,
      decimals
    );

  return (
    Math.round(
      (number + Number.EPSILON) *
        factor
    ) / factor
  );

}


// ============================================================
// PERCENTAGE
// ============================================================

function calculatePercentage(
  amount,
  percentage
) {

  return roundMoney(
    numberOrZero(amount) *
      numberOrZero(percentage) /
      100
  );

}


// ============================================================
// APPROXIMATE EQUALITY
// ============================================================

function amountsMatch(
  first,
  second,
  tolerance = DEFAULT_TOLERANCE
) {

  if (
    first === null ||
    second === null ||
    first === undefined ||
    second === undefined
  ) {
    return false;
  }

  return (
    Math.abs(
      numberOrZero(first) -
      numberOrZero(second)
    ) <= tolerance
  );

}


// ============================================================
// GET RESOLVED VALUE
// ============================================================
//
// Accepts:
//
// resolvedField
// primitive
// null
//
// This makes the resolver compatible with both:
//
// canonical.purchase.quantity
//
// and:
//
// canonical.purchase.quantity.value
// ============================================================

function getResolvedValue(
  field
) {

  if (
    field &&
    typeof field === "object" &&
    Object.prototype.hasOwnProperty.call(
      field,
      "value"
    )
  ) {

    return nullableNumber(
      field.value
    );

  }

  return nullableNumber(
    field
  );

}


// ============================================================
// EXTRACT VALUES FROM BASIC RESOLVER
// ============================================================

function getPurchaseQuantity(
  basic
) {

  return getResolvedValue(
    basic
      ?.purchase
      ?.quantity
  );

}


function getPurchaseRate(
  basic
) {

  return getResolvedValue(
    basic
      ?.purchase
      ?.purchaseRate
  );

}


function getDiscountRate(
  basic
) {

  return getResolvedValue(
    basic
      ?.purchase
      ?.discountRate
  ) || 0;

}


function getDiscountAmount(
  basic
) {

  return getResolvedValue(
    basic
      ?.purchase
      ?.discountAmount
  ) || 0;

}


function getGST(
  basic
) {

  return getResolvedValue(
    basic
      ?.tax
      ?.gstRate
  ) || 0;

}


function getExtractedTaxableAmount(
  basic
) {

  return getResolvedValue(
    basic
      ?.purchase
      ?.extractedTaxableAmount
  );

}


function getExtractedAmount(
  basic
) {

  return getResolvedValue(
    basic
      ?.extractedAmount
  );

}


// ============================================================
// CALCULATE BASE AMOUNT
// ============================================================
//
// Example:
//
// Qty = 10
// Rate = 180
//
// Base = 1800
// ============================================================

function calculateBaseAmount(
  quantity,
  purchaseRate
) {

  if (
    quantity === null ||
    purchaseRate === null
  ) {
    return null;
  }

  return roundMoney(
    quantity *
      purchaseRate
  );

}


// ============================================================
// CALCULATE DISCOUNT
// ============================================================
//
// Supports both:
//
// percentage discount
//
// OR
//
// fixed discount amount
//
// If both exist, percentage is preferred because that is how
// your Purchase Review currently works.
// ============================================================

function calculateDiscountAmount(
  baseAmount,
  discountRate,
  explicitDiscountAmount
) {

  if (
    baseAmount === null
  ) {
    return null;
  }

  const rate =
    numberOrZero(
      discountRate
    );


  if (
    rate > 0
  ) {

    return calculatePercentage(
      baseAmount,
      rate
    );

  }


  const explicit =
    numberOrZero(
      explicitDiscountAmount
    );


  if (
    explicit > 0
  ) {

    return roundMoney(
      explicit
    );

  }


  return 0;

}


// ============================================================
// CALCULATE TAXABLE AMOUNT
// ============================================================

function calculateTaxableAmount(
  baseAmount,
  discountAmount
) {

  if (
    baseAmount === null
  ) {
    return null;
  }

  return roundMoney(
    Math.max(
      0,
      baseAmount -
        numberOrZero(
          discountAmount
        )
    )
  );

}


// ============================================================
// CALCULATE GST
// ============================================================

function calculateGSTAmount(
  taxableAmount,
  gstRate
) {

  if (
    taxableAmount === null
  ) {
    return null;
  }

  return calculatePercentage(
    taxableAmount,
    gstRate
  );

}


// ============================================================
// CALCULATE TOTAL EXCLUSIVE TAX
// ============================================================

function calculateExclusiveTaxTotal(
  taxableAmount,
  gstAmount
) {

  if (
    taxableAmount === null
  ) {
    return null;
  }

  return roundMoney(
    taxableAmount +
      numberOrZero(
        gstAmount
      )
  );

}


// ============================================================
// CALCULATE INCLUSIVE TAX VALUES
// ============================================================
//
// If purchase rate already includes GST:
//
// Gross = Qty × Rate
//
// Taxable = Gross / (1 + GST%)
// GST = Gross - Taxable
// ============================================================

function calculateInclusiveTax(
  grossAmount,
  gstRate
) {

  if (
    grossAmount === null
  ) {

    return {

      taxableAmount:
        null,

      gstAmount:
        null,

    };

  }


  if (
    !gstRate ||
    gstRate <= 0
  ) {

    return {

      taxableAmount:
        roundMoney(
          grossAmount
        ),

      gstAmount:
        0,

    };

  }


  const divisor =
    1 +
    (
      gstRate /
      100
    );


  const taxableAmount =
    roundMoney(
      grossAmount /
      divisor
    );


  const gstAmount =
    roundMoney(
      grossAmount -
      taxableAmount
    );


  return {

    taxableAmount,

    gstAmount,

  };

}


// ============================================================
// DETECT EXTRACTED AMOUNT MEANING
// ============================================================
//
// Suppose:
//
// Qty       = 10
// Rate      = 180
// GST       = 5%
//
// Calculated taxable = 1800
// Calculated total   = 1890
//
// Invoice says amount = 1800
//
// This probably means "net/taxable amount".
//
// Invoice says amount = 1890
//
// This probably means "total including GST".
//
// Invoice says amount = 1750
//
// Unknown/mismatch.
// ============================================================

function detectAmountMeaning({
  extractedAmount,
  extractedTaxableAmount,
  calculatedBaseAmount,
  calculatedDiscountAmount,
  calculatedTaxableAmount,
  calculatedGSTAmount,
  calculatedTotalAmount,
}) {

  const result = {

    meaning:
      "unknown",

    confidence:
      0,

    matched:
      false,

    reason:
      null,

  };


  if (
    extractedAmount === null
  ) {

    return result;

  }


  // ----------------------------------------------------------
  // Direct total match
  // ----------------------------------------------------------

  if (
    amountsMatch(
      extractedAmount,
      calculatedTotalAmount
    )
  ) {

    return {

      meaning:
        "total",

      confidence:
        0.98,

      matched:
        true,

      reason:
        "Invoice amount matches calculated total including GST",

    };

  }


  // ----------------------------------------------------------
  // Taxable match
  // ----------------------------------------------------------

  if (
    amountsMatch(
      extractedAmount,
      calculatedTaxableAmount
    )
  ) {

    return {

      meaning:
        "taxable",

      confidence:
        0.97,

      matched:
        true,

      reason:
        "Invoice amount matches calculated taxable amount",

    };

  }


  // ----------------------------------------------------------
  // Base match
  // ----------------------------------------------------------

  if (
    amountsMatch(
      extractedAmount,
      calculatedBaseAmount
    )
  ) {

    return {

      meaning:
        "gross_before_discount_tax",

      confidence:
        0.92,

      matched:
        true,

      reason:
        "Invoice amount matches quantity × purchase rate",

    };

  }


  // ----------------------------------------------------------
  // Discounted amount
  // ----------------------------------------------------------

  const discountedAmount =
    calculatedBaseAmount === null
      ? null
      : roundMoney(
          calculatedBaseAmount -
          numberOrZero(
            calculatedDiscountAmount
          )
        );


  if (
    amountsMatch(
      extractedAmount,
      discountedAmount
    )
  ) {

    return {

      meaning:
        "net_before_tax",

      confidence:
        0.96,

      matched:
        true,

      reason:
        "Invoice amount matches discounted value before GST",

    };

  }


  // ----------------------------------------------------------
  // Explicit taxable amount match
  // ----------------------------------------------------------

  if (
    extractedTaxableAmount !== null &&
    amountsMatch(
      extractedAmount,
      extractedTaxableAmount
    )
  ) {

    return {

      meaning:
        "taxable",

      confidence:
        0.90,

      matched:
        true,

      reason:
        "Invoice amount matches extracted taxable amount",

    };

  }


  return result;

}


// ============================================================
// RESOLVE LINE AMOUNT
// ============================================================

function resolveLineAmount(
  basic,
  options = {}
) {

  const tolerance =
    options.tolerance ??
    DEFAULT_TOLERANCE;


  const quantity =
    getPurchaseQuantity(
      basic
    );


  const purchaseRate =
    getPurchaseRate(
      basic
    );


  const discountRate =
    getDiscountRate(
      basic
    );


  const explicitDiscountAmount =
    getDiscountAmount(
      basic
    );


  const gstRate =
    getGST(
      basic
    );


  const extractedTaxableAmount =
    getExtractedTaxableAmount(
      basic
    );


  const extractedAmount =
    getExtractedAmount(
      basic
    );


  const pricingMode =
    basic?.pricingMode ||
    PRICING_MODE.UNKNOWN;


  // ----------------------------------------------------------
  // BASE
  // ----------------------------------------------------------

  const baseAmount =
    calculateBaseAmount(
      quantity,
      purchaseRate
    );


  // ----------------------------------------------------------
  // DISCOUNT
  // ----------------------------------------------------------

  const discountAmount =
    calculateDiscountAmount(
      baseAmount,
      discountRate,
      explicitDiscountAmount
    );


  // ----------------------------------------------------------
  // NORMAL EXCLUSIVE TAX CALCULATION
  // ----------------------------------------------------------

  let taxableAmount =
    calculateTaxableAmount(
      baseAmount,
      discountAmount
    );


  let gstAmount =
    calculateGSTAmount(
      taxableAmount,
      gstRate
    );


  let totalAmount =
    calculateExclusiveTaxTotal(
      taxableAmount,
      gstAmount
    );


  // ----------------------------------------------------------
  // INCLUSIVE TAX
  // ----------------------------------------------------------

  if (
    pricingMode ===
    PRICING_MODE.INCLUSIVE_TAX
  ) {

    const inclusive =
      calculateInclusiveTax(
        taxableAmount,
        gstRate
      );


    taxableAmount =
      inclusive.taxableAmount;


    gstAmount =
      inclusive.gstAmount;


    totalAmount =
      calculateBaseAmount(
        quantity,
        purchaseRate
      );

  }


  // ----------------------------------------------------------
  // DETECT WHAT RAW AMOUNT REPRESENTS
  // ----------------------------------------------------------

  const amountMeaning =
    detectAmountMeaning({

      extractedAmount,

      extractedTaxableAmount,

      calculatedBaseAmount:
        baseAmount,

      calculatedDiscountAmount:
        discountAmount,

      calculatedTaxableAmount:
        taxableAmount,

      calculatedGSTAmount:
        gstAmount,

      calculatedTotalAmount:
        totalAmount,

    });


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  const issues = [];


  if (
    quantity === null
  ) {

    issues.push(
      validationIssue({

        code:
          "MISSING_QUANTITY",

        field:
          "quantity",

        severity:
          VALIDATION_SEVERITY.ERROR,

        message:
          "Purchase quantity is missing",

        suggestion:
          "Enter the invoice quantity",

      })
    );

  }


  if (
    purchaseRate === null
  ) {

    issues.push(
      validationIssue({

        code:
          "MISSING_PURCHASE_RATE",

        field:
          "purchaseRate",

        severity:
          VALIDATION_SEVERITY.ERROR,

        message:
          "Purchase rate is missing",

        suggestion:
          "Enter the invoice purchase rate",

      })
    );

  }


  // ----------------------------------------------------------
  // RAW TAXABLE AMOUNT CHECK
  // ----------------------------------------------------------

  if (
    extractedTaxableAmount !== null &&
    taxableAmount !== null
  ) {

    if (
      Math.abs(
        extractedTaxableAmount -
        taxableAmount
      ) > tolerance
    ) {

      issues.push(
        validationIssue({

          code:
            "TAXABLE_AMOUNT_MISMATCH",

          field:
            "taxableAmount",

          severity:
            VALIDATION_SEVERITY.WARNING,

          message:
            "Extracted taxable amount does not match the calculated taxable amount",

          expected:
            taxableAmount,

          actual:
            extractedTaxableAmount,

          suggestion:
            "Review purchase rate, quantity, discount and tax",

        })
      );

    }

  }


  // ----------------------------------------------------------
  // RAW TOTAL CHECK
  // ----------------------------------------------------------

  if (
    extractedAmount !== null
  ) {

    if (
      !amountMeaning.matched
    ) {

      issues.push(
        validationIssue({

          code:
            "AMOUNT_MISMATCH",

          field:
            "amount",

          severity:
            VALIDATION_SEVERITY.WARNING,

          message:
            "Invoice amount does not match the calculated line values",

          expected:
            totalAmount,

          actual:
            extractedAmount,

          suggestion:
            "Verify whether the invoice amount is taxable, discounted or GST-inclusive",

        })
      );

    }

  }


  // ----------------------------------------------------------
  // RESOLVED FIELDS
  // ----------------------------------------------------------

  const resolvedTaxableAmount =
    resolvedField(
      taxableAmount,
      baseAmount !== null
        ? FIELD_SOURCE.SYSTEM
        : FIELD_SOURCE.SYSTEM,
      FIELD_METHOD.CALCULATED,
      taxableAmount !== null
        ? 0.98
        : 0,
      {

        reason:
          "Calculated from quantity, purchase rate and discount",

      }
    );


  const resolvedGSTAmount =
    resolvedField(
      gstAmount,
      FIELD_SOURCE.SYSTEM,
      FIELD_METHOD.CALCULATED,
      gstAmount !== null
        ? 0.98
        : 0,
      {

        reason:
          "Calculated from taxable amount and GST rate",

      }
    );

// ============================================================
// RESOLVED TOTAL AMOUNT
// ============================================================
//
// IMPORTANT:
//
// If the invoice/API provides a line total_amount, that value
// is the invoice's actual extracted amount and must be preserved
// as the canonical/display amount.
//
// The calculated amount is still retained separately for
// validation and intelligence.
//
// Example:
//
//   extractedAmount = 540.04
//   calculatedAmount = 22.50
//
//   resolvedTotalAmount = 540.04
//
// ============================================================

const resolvedTotalAmount =
  extractedAmount !== null
    ? resolvedField(
        extractedAmount,
        FIELD_SOURCE.INVOICE,
        FIELD_METHOD.EXTRACTED,
        amountMeaning.matched
          ? 0.98
          : 0.90,
        {
          reason:
            amountMeaning.matched
              ? "Using invoice extracted line total"
              : "Using invoice extracted line total; calculated value retained for validation",

          warnings:
            amountMeaning.matched
              ? []
              : [
                  "Extracted line amount differs from calculated line amount",
                ],

          alternatives:
            totalAmount !== null
              ? [
                  {
                    value:
                      totalAmount,

                    source:
                      FIELD_SOURCE.SYSTEM,

                    method:
                      FIELD_METHOD.CALCULATED,

                    reason:
                      "Calculated line amount retained for validation",
                  },
                ]
              : [],
        }
      )
    : resolvedField(
        totalAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        totalAmount !== null
          ? 0.98
          : 0,
        {
          reason:
            "No extracted line total available; calculated amount used",
        }
      );

  // ----------------------------------------------------------
  // CONFIDENCE
  // ----------------------------------------------------------

  let confidence = 0;


  if (
    quantity !== null
  ) {
    confidence += 0.20;
  }


  if (
    purchaseRate !== null
  ) {
    confidence += 0.25;
  }


  if (
    gstRate !== null
  ) {
    confidence += 0.15;
  }


  if (
    taxableAmount !== null
  ) {
    confidence += 0.20;
  }


  if (
    extractedAmount !== null &&
    amountMeaning.matched
  ) {
    confidence += 0.20;
  }


  confidence =
    Math.min(
      1,
      confidence
    );


  // ----------------------------------------------------------
  // FINAL RESULT
  // ----------------------------------------------------------

  return {

    calculated: {

      baseAmount,

      discountAmount,

      taxableAmount,

      gstAmount,

      totalAmount,

    },


    extracted: {

      amount:
        extractedAmount,

      taxableAmount:
        extractedTaxableAmount,

    },


    amountMeaning,


    resolved: {

      taxableAmount:
        resolvedTaxableAmount,

      gstAmount:
        resolvedGSTAmount,

      totalAmount:
        resolvedTotalAmount,

    },


    validation: {

      valid:
        !issues.some(
          issue =>
            issue.severity ===
            VALIDATION_SEVERITY.ERROR
        ),

      issues,

      amountMatched:
        amountMeaning.matched,

    },


    confidence,

  };

}


// ============================================================
// RESOLVE MULTIPLE LINES
// ============================================================

function resolveInvoiceAmounts(
  basicLines = [],
  options = {}
) {

  const lines =
    Array.isArray(
      basicLines
    )
      ? basicLines
      : [];


  const resolvedLines =
    lines.map(
      (line, index) => {

        const result =
          resolveLineAmount(
            line,
            options
          );


        return {

          lineNumber:
            index + 1,

          ...result,

        };

      }
    );


  // ----------------------------------------------------------
  // TOTALS
  // ----------------------------------------------------------

  let taxableAmount = 0;

  let gstAmount = 0;

  let totalAmount = 0;

  let extractedAmount = 0;


  let hasCalculatedValues =
    false;


  let hasExtractedAmount =
    false;


  for (
    const line
    of resolvedLines
  ) {

    if (
      line.calculated
        .taxableAmount !== null
    ) {

      taxableAmount +=
        numberOrZero(
          line.calculated
            .taxableAmount
        );

      hasCalculatedValues =
        true;

    }


    if (
      line.calculated
        .gstAmount !== null
    ) {

      gstAmount +=
        numberOrZero(
          line.calculated
            .gstAmount
        );

    }


    if (
      line.calculated
        .totalAmount !== null
    ) {

      totalAmount +=
        numberOrZero(
          line.calculated
            .totalAmount
        );

    }


    if (
      line.extracted
        .amount !== null
    ) {

      extractedAmount +=
        numberOrZero(
          line.extracted
            .amount
        );

      hasExtractedAmount =
        true;

    }

  }


  taxableAmount =
    hasCalculatedValues
      ? roundMoney(
          taxableAmount
        )
      : null;


  gstAmount =
    hasCalculatedValues
      ? roundMoney(
          gstAmount
        )
      : null;


  totalAmount =
    hasCalculatedValues
      ? roundMoney(
          totalAmount
        )
      : null;


  extractedAmount =
    hasExtractedAmount
      ? roundMoney(
          extractedAmount
        )
      : null;


  // ----------------------------------------------------------
  // INVOICE LEVEL AMOUNT COMPARISON
  // ----------------------------------------------------------

  let invoiceTotalMatched =
    false;


  if (
    extractedAmount !== null &&
    totalAmount !== null
  ) {

    invoiceTotalMatched =
      amountsMatch(
        extractedAmount,
        totalAmount,
        options.tolerance ??
          DEFAULT_TOLERANCE
      );

  }


  // ----------------------------------------------------------
  // ISSUE SUMMARY
  // ----------------------------------------------------------

  const amountMismatches =
    resolvedLines.filter(
      line =>
        !line.validation
          .amountMatched &&
        line.extracted
          .amount !== null
    ).length;


  const missingValues =
    resolvedLines.filter(
      line =>
        line.calculated
          .totalAmount === null
    ).length;


  return {

    lines:
      resolvedLines,

    totals: {

      taxableAmount,

      gstAmount,

      totalAmount,

      extractedAmount,

    },

    validation: {

      invoiceTotalMatched,

      amountMismatches,

      missingValues,

      valid:
        missingValues === 0 &&
        amountMismatches === 0,

    },

  };

}


// ============================================================
// CREATE FINAL CANONICAL AMOUNT OBJECT
// ============================================================
//
// This is useful for the next normalizer.
//
// Example:
//
// const amount = createCanonicalAmount(...)
//
// ============================================================

function createCanonicalAmount(result) {

  if (!result) {

    return {

      baseAmount: null,

      discountAmount: 0,

      taxableAmount: null,

      gstAmount: 0,

      totalAmount: null,

      extractedAmount: null,

      calculatedAmount: null,

      resolvedAmount: null,

      amountMeaning: "unknown",

      matched: false,

    };

  }


  const resolvedTotal =
    result
      ?.resolved
      ?.totalAmount
      ?.value ??
    result
      ?.calculated
      ?.totalAmount ??
    null;


  const calculatedTotal =
    result
      ?.calculated
      ?.totalAmount ??
    null;


  const extractedTotal =
    result
      ?.extracted
      ?.amount ??
    null;


  return {

    // --------------------------------------------------------
    // CALCULATED VALUES
    // --------------------------------------------------------

    baseAmount:
      result
        ?.calculated
        ?.baseAmount ??
      null,

    discountAmount:
      result
        ?.calculated
        ?.discountAmount ??
      0,

    taxableAmount:
      result
        ?.calculated
        ?.taxableAmount ??
      null,

    gstAmount:
      result
        ?.calculated
        ?.gstAmount ??
      0,

    // --------------------------------------------------------
    // IMPORTANT
    //
    // This is the amount the application should use/display.
    // --------------------------------------------------------

    totalAmount:
      resolvedTotal,

    // --------------------------------------------------------
    // Explicit calculated value
    // --------------------------------------------------------

    calculatedAmount:
      calculatedTotal,

    // --------------------------------------------------------
    // Original extracted invoice value
    //
    // Example:
    // API says 540.04
    // We preserve 540.04 here.
    // --------------------------------------------------------

    extractedAmount:
      extractedTotal,

    // --------------------------------------------------------
    // Explicit resolved value
    // --------------------------------------------------------

    resolvedAmount:
      resolvedTotal,

    // --------------------------------------------------------
    // INTELLIGENCE
    // --------------------------------------------------------

    amountMeaning:
      result
        ?.amountMeaning
        ?.meaning ??
      "unknown",

    matched:
      Boolean(
        result
          ?.amountMeaning
          ?.matched
      ),

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    validation:
      result?.validation ??
      null,

    // --------------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------------

    confidence:
      result?.confidence ??
      0,

  };

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  DEFAULT_TOLERANCE,

  PERCENT_TOLERANCE,

  roundMoney,

  amountsMatch,

  calculatePercentage,

  calculateBaseAmount,

  calculateDiscountAmount,

  calculateTaxableAmount,

  calculateGSTAmount,

  calculateExclusiveTaxTotal,

  calculateInclusiveTax,

  detectAmountMeaning,

  resolveLineAmount,

  resolveInvoiceAmounts,

  createCanonicalAmount,

};