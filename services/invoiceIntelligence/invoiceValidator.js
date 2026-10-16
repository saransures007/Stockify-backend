// ============================================================
// INVOICE VALIDATOR
// ============================================================
//
// Responsibility:
//
// Validate the CANONICAL invoice after all field resolution.
//
// It does NOT:
//   - extract OCR data
//   - resolve fields
//   - calculate amounts
//   - modify the invoice
//
// It only reports problems.
//
// ============================================================

const {
  SEVERITY,
} = require("./canonicalTypes");


// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_AMOUNT_TOLERANCE = 0.05;


// ============================================================
// SAFE ARRAY
// ============================================================

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


// ============================================================
// SAFE NUMBER
// ============================================================

function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(
      value,
      "value"
    )
  ) {
    return toNumber(
      value.value
    );
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


// ============================================================
// GET RESOLVED VALUE
// ============================================================

function getValue(field) {

  if (
    field === null ||
    field === undefined
  ) {
    return null;
  }

  if (
    typeof field === "object" &&
    Object.prototype.hasOwnProperty.call(
      field,
      "value"
    )
  ) {
    return field.value;
  }

  return field;
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
// CREATE ISSUE
// ============================================================

function issue(
  code,
  severity,
  message,
  extra = {}
) {

  return {
    code,
    severity,
    message,
    ...extra,
  };

}


// ============================================================
// FIELD MISSING
// ============================================================

function isMissing(value) {

  const resolved =
    getValue(value);

  return (
    resolved === null ||
    resolved === undefined ||
    String(resolved).trim() === ""
  );

}


// ============================================================
// VALIDATE PRODUCT
// ============================================================

function validateProduct(
  line,
  index
) {

  const issues = [];

  const product =
    line?.product || {};


  const lineNumber =
    index + 1;


  // ----------------------------------------------------------
  // PRODUCT NAME
  // ----------------------------------------------------------

  if (
    isMissing(
      product.name
    )
  ) {

    issues.push(
      issue(
        "MISSING_PRODUCT",
        SEVERITY.ERROR,
        "Product name is missing",
        {
          lineNumber,
          field: "product",
        }
      )
    );

  }


  // ----------------------------------------------------------
  // HSN
  // ----------------------------------------------------------

  if (
    isMissing(
      product.hsn
    )
  ) {

    issues.push(
      issue(
        "MISSING_HSN",
        SEVERITY.WARNING,
        "HSN is missing",
        {
          lineNumber,
          field: "hsn",
        }
      )
    );

  }


  // ----------------------------------------------------------
  // UNIT
  // ----------------------------------------------------------

  if (
    isMissing(
      product.unit
    )
  ) {

    issues.push(
      issue(
        "MISSING_UNIT",
        SEVERITY.WARNING,
        "Unit is missing",
        {
          lineNumber,
          field: "unit",
        }
      )
    );

  }


  // ----------------------------------------------------------
  // MRP
  // ----------------------------------------------------------

  const mrp =
    toNumber(
      product.mrp
    );


  if (
    mrp !== null &&
    mrp < 0
  ) {

    issues.push(
      issue(
        "INVALID_MRP",
        SEVERITY.ERROR,
        "MRP cannot be negative",
        {
          lineNumber,
          field: "mrp",
          value: mrp,
        }
      )
    );

  }


  return issues;

}


// ============================================================
// VALIDATE PURCHASE
// ============================================================

function validatePurchase(
  line,
  index
) {

  const issues = [];

  const purchase =
    line?.purchase || {};


  const lineNumber =
    index + 1;


  // ----------------------------------------------------------
  // QUANTITY
  // ----------------------------------------------------------

  const quantity =
    toNumber(
      purchase.quantity
    );


  if (
    quantity === null
  ) {

    issues.push(
      issue(
        "MISSING_QUANTITY",
        SEVERITY.ERROR,
        "Quantity is missing",
        {
          lineNumber,
          field: "quantity",
        }
      )
    );

  } else if (
    quantity <= 0
  ) {

    issues.push(
      issue(
        "INVALID_QUANTITY",
        SEVERITY.ERROR,
        "Quantity must be greater than zero",
        {
          lineNumber,
          field: "quantity",
          value: quantity,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // PURCHASE RATE
  // ----------------------------------------------------------

  const rate =
    toNumber(
      purchase.purchaseRate
    );


  if (
    rate === null
  ) {

    issues.push(
      issue(
        "MISSING_PURCHASE_RATE",
        SEVERITY.ERROR,
        "Purchase rate is missing",
        {
          lineNumber,
          field: "purchaseRate",
        }
      )
    );

  } else if (
    rate < 0
  ) {

    issues.push(
      issue(
        "INVALID_PURCHASE_RATE",
        SEVERITY.ERROR,
        "Purchase rate cannot be negative",
        {
          lineNumber,
          field: "purchaseRate",
          value: rate,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // DISCOUNT RATE
  // ----------------------------------------------------------

  const discountRate =
    toNumber(
      purchase.discountRate
    );


  if (
    discountRate !== null &&
    (
      discountRate < 0 ||
      discountRate > 100
    )
  ) {

    issues.push(
      issue(
        "INVALID_DISCOUNT_RATE",
        SEVERITY.ERROR,
        "Discount percentage must be between 0 and 100",
        {
          lineNumber,
          field: "discountRate",
          value: discountRate,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // DISCOUNT AMOUNT
  // ----------------------------------------------------------

  const discountAmount =
    toNumber(
      purchase.discountAmount
    );


  if (
    discountAmount !== null &&
    discountAmount < 0
  ) {

    issues.push(
      issue(
        "INVALID_DISCOUNT_AMOUNT",
        SEVERITY.ERROR,
        "Discount amount cannot be negative",
        {
          lineNumber,
          field: "discountAmount",
          value: discountAmount,
        }
      )
    );

  }


  return issues;

}


// ============================================================
// VALIDATE TAX
// ============================================================

function validateTax(
  line,
  index
) {

  const issues = [];

  const tax =
    line?.tax || {};


  const lineNumber =
    index + 1;


  // ----------------------------------------------------------
  // GST
  // ----------------------------------------------------------

  const gst =
    toNumber(
      tax.gstRate
    );


  if (
    gst !== null &&
    (
      gst < 0 ||
      gst > 100
    )
  ) {

    issues.push(
      issue(
        "INVALID_GST_RATE",
        SEVERITY.ERROR,
        "GST rate must be between 0 and 100",
        {
          lineNumber,
          field: "gstRate",
          value: gst,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // CGST
  // ----------------------------------------------------------

  const cgst =
    toNumber(
      tax.cgstRate
    );


  if (
    cgst !== null &&
    (
      cgst < 0 ||
      cgst > 100
    )
  ) {

    issues.push(
      issue(
        "INVALID_CGST_RATE",
        SEVERITY.ERROR,
        "CGST rate must be between 0 and 100",
        {
          lineNumber,
          field: "cgstRate",
          value: cgst,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // SGST
  // ----------------------------------------------------------

  const sgst =
    toNumber(
      tax.sgstRate
    );


  if (
    sgst !== null &&
    (
      sgst < 0 ||
      sgst > 100
    )
  ) {

    issues.push(
      issue(
        "INVALID_SGST_RATE",
        SEVERITY.ERROR,
        "SGST rate must be between 0 and 100",
        {
          lineNumber,
          field: "sgstRate",
          value: sgst,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // IGST
  // ----------------------------------------------------------

  const igst =
    toNumber(
      tax.igstRate
    );


  if (
    igst !== null &&
    (
      igst < 0 ||
      igst > 100
    )
  ) {

    issues.push(
      issue(
        "INVALID_IGST_RATE",
        SEVERITY.ERROR,
        "IGST rate must be between 0 and 100",
        {
          lineNumber,
          field: "igstRate",
          value: igst,
        }
      )
    );

  }


  // ----------------------------------------------------------
  // GST CONSISTENCY
  // ----------------------------------------------------------

  if (
    gst !== null &&
    cgst !== null &&
    sgst !== null
  ) {

    const combined =
      roundMoney(
        cgst + sgst
      );


    const difference =
      Math.abs(
        combined - gst
      );


    if (
      difference > 0.01
    ) {

      issues.push(
        issue(
          "GST_COMPONENT_MISMATCH",
          SEVERITY.WARNING,
          "GST rate does not match CGST + SGST",
          {
            lineNumber,
            field: "gstRate",
            gstRate: gst,
            cgstRate: cgst,
            sgstRate: sgst,
          }
        )
      );

    }

  }


  return issues;

}


// ============================================================
// VALIDATE AMOUNTS
// ============================================================

function validateAmounts(
  line,
  index,
  options = {}
) {

  const issues = [];

  const purchase =
    line?.purchase || {};

  const totals =
    line?.totals || {};


  const lineNumber =
    index + 1;


  const quantity =
    toNumber(
      purchase.quantity
    );


  const rate =
    toNumber(
      purchase.purchaseRate
    );


  const discountAmount =
    toNumber(
      purchase.discountAmount
    ) || 0;


  const taxableAmount =
    toNumber(
      totals.taxableAmount
    );


  const totalAmount =
    toNumber(
      totals.totalAmount
    );


  // ----------------------------------------------------------
  // BASIC CALCULATION
  // ----------------------------------------------------------

  if (
    quantity !== null &&
    rate !== null
  ) {

    const baseAmount =
      roundMoney(
        quantity * rate
      );


    const expectedTaxable =
      roundMoney(
        Math.max(
          0,
          baseAmount -
          discountAmount
        )
      );


    // --------------------------------------------------------
    // TAXABLE AMOUNT CHECK
    // --------------------------------------------------------

    if (
      taxableAmount !== null
    ) {

      const difference =
        Math.abs(
          taxableAmount -
          expectedTaxable
        );


      const tolerance =
        Number(
          options.tolerance ??
          DEFAULT_AMOUNT_TOLERANCE
        );


      if (
        difference > tolerance
      ) {

        issues.push(
          issue(
            "TAXABLE_AMOUNT_MISMATCH",
            SEVERITY.WARNING,
            "Taxable amount differs from calculated line amount",
            {
              lineNumber,
              field: "taxableAmount",
              expected:
                expectedTaxable,
              actual:
                taxableAmount,
              difference:
                roundMoney(
                  difference
                ),
            }
          )
        );

      }

    }

  }


  // ----------------------------------------------------------
  // TOTAL MUST EXIST
  // ----------------------------------------------------------

  if (
    totalAmount === null
  ) {

    issues.push(
      issue(
        "MISSING_TOTAL_AMOUNT",
        SEVERITY.WARNING,
        "Final line amount could not be resolved",
        {
          lineNumber,
          field: "totalAmount",
        }
      )
    );

  }


  return issues;

}


// ============================================================
// VALIDATE ONE LINE
// ============================================================

function validateLine(
  line,
  index,
  options = {}
) {

  const issues = [

    ...validateProduct(
      line,
      index
    ),

    ...validatePurchase(
      line,
      index
    ),

    ...validateTax(
      line,
      index
    ),

    ...validateAmounts(
      line,
      index,
      options
    ),

  ];


  return {

    valid:
      !issues.some(
        item =>
          item.severity ===
          SEVERITY.ERROR
      ),

    requiresReview:
      issues.length > 0,

    issues,

  };

}


// ============================================================
// VALIDATE INVOICE HEADER
// ============================================================

function validateInvoiceHeader(
  invoice
) {

  const issues = [];


  // ----------------------------------------------------------
  // INVOICE NUMBER
  // ----------------------------------------------------------

  if (
    isMissing(
      invoice?.invoiceNumber
    )
  ) {

    issues.push(
      issue(
        "MISSING_INVOICE_NUMBER",
        SEVERITY.WARNING,
        "Invoice number is missing",
        {
          field:
            "invoiceNumber",
        }
      )
    );

  }


  // ----------------------------------------------------------
  // INVOICE DATE
  // ----------------------------------------------------------

  if (
    isMissing(
      invoice?.invoiceDate
    )
  ) {

    issues.push(
      issue(
        "MISSING_INVOICE_DATE",
        SEVERITY.WARNING,
        "Invoice date is missing",
        {
          field:
            "invoiceDate",
        }
      )
    );

  }


  return issues;

}


// ============================================================
// VALIDATE INVOICE TOTALS
// ============================================================

function validateInvoiceTotals(
  canonicalInvoice,
  options = {}
) {

  const issues = [];

  const lines =
    safeArray(
      canonicalInvoice?.lines
    );


  const invoiceTotals =
    canonicalInvoice?.totals ||
    {};


  let calculatedTaxable =
    0;

  let calculatedTax =
    0;

  let calculatedTotal =
    0;


  let hasTaxable =
    false;

  let hasTotal =
    false;


  lines.forEach(
    line => {

      const taxable =
        toNumber(
          line
            ?.totals
            ?.taxableAmount
        );


      const tax =
        toNumber(
          line
            ?.totals
            ?.taxAmount
        );


      const total =
        toNumber(
          line
            ?.totals
            ?.totalAmount
        );


      if (
        taxable !== null
      ) {

        calculatedTaxable +=
          taxable;

        hasTaxable =
          true;

      }


      if (
        tax !== null
      ) {

        calculatedTax +=
          tax;

      }


      if (
        total !== null
      ) {

        calculatedTotal +=
          total;

        hasTotal =
          true;

      }

    }
  );


  // ----------------------------------------------------------
  // TAXABLE TOTAL
  // ----------------------------------------------------------

  const invoiceTaxable =
    toNumber(
      invoiceTotals
        ?.taxableAmount
    );


  if (
    invoiceTaxable !== null &&
    hasTaxable
  ) {

    const difference =
      Math.abs(
        roundMoney(
          calculatedTaxable
        ) -
        roundMoney(
          invoiceTaxable
        )
      );


    if (
      difference >
      Number(
        options.tolerance ??
        DEFAULT_AMOUNT_TOLERANCE
      )
    ) {

      issues.push(
        issue(
          "INVOICE_TAXABLE_MISMATCH",
          SEVERITY.WARNING,
          "Invoice taxable total does not match the sum of line taxable amounts",
          {
            field:
              "taxableAmount",

            expected:
              roundMoney(
                calculatedTaxable
              ),

            actual:
              roundMoney(
                invoiceTaxable
              ),

            difference:
              roundMoney(
                difference
              ),
          }
        )
      );

    }

  }


  // ----------------------------------------------------------
  // TAX TOTAL
  // ----------------------------------------------------------

  const invoiceTax =
    toNumber(
      invoiceTotals
        ?.taxAmount
    );


  if (
    invoiceTax !== null
  ) {

    const difference =
      Math.abs(
        roundMoney(
          calculatedTax
        ) -
        roundMoney(
          invoiceTax
        )
      );


    if (
      difference >
      Number(
        options.tolerance ??
        DEFAULT_AMOUNT_TOLERANCE
      )
    ) {

      issues.push(
        issue(
          "INVOICE_TAX_MISMATCH",
          SEVERITY.WARNING,
          "Invoice tax total does not match the sum of line tax amounts",
          {
            field:
              "taxAmount",

            expected:
              roundMoney(
                calculatedTax
              ),

            actual:
              roundMoney(
                invoiceTax
              ),

            difference:
              roundMoney(
                difference
              ),
          }
        )
      );

    }

  }


  // ----------------------------------------------------------
  // GRAND TOTAL
  // ----------------------------------------------------------

  const invoiceTotal =
    toNumber(
      invoiceTotals
        ?.totalAmount
    );


  if (
    invoiceTotal !== null &&
    hasTotal
  ) {

    const difference =
      Math.abs(
        roundMoney(
          calculatedTotal
        ) -
        roundMoney(
          invoiceTotal
        )
      );


    if (
      difference >
      Number(
        options.tolerance ??
        DEFAULT_AMOUNT_TOLERANCE
      )
    ) {

      issues.push(
        issue(
          "INVOICE_TOTAL_MISMATCH",
          SEVERITY.WARNING,
          "Invoice total does not match the sum of line totals",
          {
            field:
              "totalAmount",

            expected:
              roundMoney(
                calculatedTotal
              ),

            actual:
              roundMoney(
                invoiceTotal
              ),

            difference:
              roundMoney(
                difference
              ),
          }
        )
      );

    }

  }


  return issues;

}


// ============================================================
// VALIDATE CANONICAL INVOICE
// ============================================================

function validateInvoice(
  canonicalInvoice,
  options = {}
) {

  if (
    !canonicalInvoice ||
    typeof canonicalInvoice !==
      "object"
  ) {

    return {

      valid:
        false,

      requiresReview:
        true,

      issues: [

        issue(
          "INVALID_CANONICAL_INVOICE",
          SEVERITY.ERROR,
          "Canonical invoice is missing or invalid"
        ),

      ],

      stats: {
        lineCount: 0,
        errorCount: 1,
        warningCount: 0,
      },

    };

  }


  const issues = [];

  const lines =
    safeArray(
      canonicalInvoice.lines
    );


  // ----------------------------------------------------------
  // NO LINES
  // ----------------------------------------------------------

  if (
    lines.length === 0
  ) {

    issues.push(
      issue(
        "NO_INVOICE_LINES",
        SEVERITY.ERROR,
        "No invoice products were detected"
      )
    );

  }


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  issues.push(
    ...validateInvoiceHeader(
      canonicalInvoice
    )
  );


  // ----------------------------------------------------------
  // LINES
  // ----------------------------------------------------------

  lines.forEach(
    (
      line,
      index
    ) => {

      const result =
        validateLine(
          line,
          index,
          options
        );


      issues.push(
        ...result.issues
      );

    }
  );


  // ----------------------------------------------------------
  // INVOICE TOTALS
  // ----------------------------------------------------------

  issues.push(
    ...validateInvoiceTotals(
      canonicalInvoice,
      options
    )
  );


  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const errorCount =
    issues.filter(
      item =>
        item.severity ===
        SEVERITY.ERROR
    ).length;


  const warningCount =
    issues.filter(
      item =>
        item.severity ===
        SEVERITY.WARNING
    ).length;


  return {

    valid:
      errorCount === 0,

    requiresReview:
      issues.length > 0,

    issues,

    stats: {

      lineCount:
        lines.length,

      errorCount,

      warningCount,

    },

  };

}


// ============================================================
// VALIDATE ONE LINE ONLY
// ============================================================

function validateSingleLine(
  line,
  options = {}
) {

  return validateLine(
    line,
    0,
    options
  );

}


// ============================================================
// GET ERRORS
// ============================================================

function getErrors(
  validation
) {

  return safeArray(
    validation?.issues
  ).filter(
    item =>
      item.severity ===
      SEVERITY.ERROR
  );

}


// ============================================================
// GET WARNINGS
// ============================================================

function getWarnings(
  validation
) {

  return safeArray(
    validation?.issues
  ).filter(
    item =>
      item.severity ===
      SEVERITY.WARNING
  );

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  DEFAULT_AMOUNT_TOLERANCE,

  toNumber,

  getValue,

  roundMoney,

  validateProduct,

  validatePurchase,

  validateTax,

  validateAmounts,

  validateLine,

  validateInvoiceHeader,

  validateInvoiceTotals,

  validateInvoice,

  validateSingleLine,

  getErrors,

  getWarnings,

};