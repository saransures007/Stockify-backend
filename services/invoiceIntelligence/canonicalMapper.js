// ============================================================
// CANONICAL INVOICE MAPPER
// ============================================================
//
// Responsibility:
//
//   Canonical Invoice
//          ↓
//   Purchase Review Model
//          ↓
//   Frontend
//
// This file DOES NOT:
//   - call Petpooja
//   - call APIs
//   - calculate invoice extraction
//   - parse supplier-specific invoice formats
//
// It only maps the canonical model into a stable structure that
// the frontend can edit/review.
//
// ============================================================


const {
  FIELD_SOURCE,
  FIELD_METHOD,
  resolvedField,
} = require("./canonicalTypes");


// ============================================================
// HELPERS
// ============================================================

function getValue(field) {

  if (
    field &&
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


function getConfidence(field) {

  if (
    field &&
    typeof field === "object" &&
    typeof field.confidence === "number"
  ) {
    return field.confidence;
  }

  return 0;
}


function getSource(field) {

  if (
    field &&
    typeof field === "object" &&
    field.source
  ) {
    return field.source;
  }

  return FIELD_SOURCE.SYSTEM;
}


function getMethod(field) {

  if (
    field &&
    typeof field === "object" &&
    field.method
  ) {
    return field.method;
  }

  return FIELD_METHOD.DEFAULTED;
}


function makeField(
  value,
  source = FIELD_SOURCE.SYSTEM,
  method = FIELD_METHOD.DEFAULTED,
  confidence = 0,
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
    }
  );
}


function cloneResolvedField(
  field,
  fallback = null
) {

  if (
    field &&
    typeof field === "object" &&
    Object.prototype.hasOwnProperty.call(
      field,
      "value"
    )
  ) {

    return makeField(
      field.value,

      getSource(
        field
      ),

      getMethod(
        field
      ),

      getConfidence(
        field
      ),
      {
        sourceField:
          field.sourceField ??
          null,

        reason:
          field.reason ??
          null,

        warnings:
          Array.isArray(
            field.warnings
          )
            ? field.warnings
            : [],

        alternatives:
          Array.isArray(
            field.alternatives
          )
            ? field.alternatives
            : [],
      }
    );
  }


  return makeField(
    field ?? fallback
  );
}


// ============================================================
// NUMBER HELPERS
// ============================================================

function numberOrZero(
  value
) {

  const raw =
    getValue(value);

  const number =
    Number(raw);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return number;
}


function roundMoney(
  value
) {

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
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
// MAP PRODUCT
// ============================================================

function mapProduct(
  canonicalLine
) {

  const product =
    canonicalLine
      ?.product ||
    {};


  return {

    id:
      cloneResolvedField(
        product.id
      ),

    name:
      cloneResolvedField(
        product.name
      ),

    code:
      cloneResolvedField(
        product.code
      ),

    hsn:
      cloneResolvedField(
        product.hsn
      ),

    unit:
      cloneResolvedField(
        product.unit
      ),

    mrp:
      cloneResolvedField(
        product.mrp
      ),

    barcode:
      cloneResolvedField(
        product.barcode
      ),
  };
}


// ============================================================
// MAP PURCHASE
// ============================================================

function mapPurchase(
  canonicalLine
) {

  const purchase =
    canonicalLine
      ?.purchase ||
    {};


  return {

    quantity:
      cloneResolvedField(
        purchase.quantity
      ),

    purchaseRate:
      cloneResolvedField(
        purchase.purchaseRate
      ),

    discountRate:
      cloneResolvedField(
        purchase.discountRate
      ),

    discountAmount:
      cloneResolvedField(
        purchase.discountAmount
      ),

    taxableAmount:
      cloneResolvedField(
        purchase.taxableAmount
      ),
  };
}


// ============================================================
// MAP TAX
// ============================================================

function mapTax(
  canonicalLine
) {

  const tax =
    canonicalLine
      ?.tax ||
    {};


  return {

    gstRate:
      cloneResolvedField(
        tax.gstRate,
        0
      ),

    cgstRate:
      cloneResolvedField(
        tax.cgstRate,
        0
      ),

    sgstRate:
      cloneResolvedField(
        tax.sgstRate,
        0
      ),

    igstRate:
      cloneResolvedField(
        tax.igstRate,
        0
      ),

    gstAmount:
      cloneResolvedField(
        tax.gstAmount,
        0
      ),

    cgstAmount:
      cloneResolvedField(
        tax.cgstAmount,
        0
      ),

    sgstAmount:
      cloneResolvedField(
        tax.sgstAmount,
        0
      ),

    igstAmount:
      cloneResolvedField(
        tax.igstAmount,
        0
      ),
  };
}


// ============================================================
// MAP TOTALS
// ============================================================

function mapTotals(
  canonicalLine
) {

  const totals =
    canonicalLine
      ?.totals ||
    {};


  return {

    taxableAmount:
      cloneResolvedField(
        totals.taxableAmount
      ),

    taxAmount:
      cloneResolvedField(
        totals.taxAmount,
        0
      ),

    totalAmount:
      cloneResolvedField(
        totals.totalAmount
      ),

    extractedAmount:
      cloneResolvedField(
        totals.extractedAmount
      ),
  };
}


// ============================================================
// MAP INTELLIGENCE
// ============================================================

function mapIntelligence(
  canonicalLine
) {

  const intelligence =
    canonicalLine
      ?.intelligence ||
    {};


  return {

    confidence:
      numberOrZero(
        intelligence.confidence
      ),

    requiresReview:
      Boolean(
        intelligence
          .requiresReview
      ),

    manuallyEditedFields:
      Array.isArray(
        intelligence
          .manuallyEditedFields
      )
        ? [
            ...intelligence
              .manuallyEditedFields
          ]
        : [],

    calculatedFields:
      Array.isArray(
        intelligence
          .calculatedFields
      )
        ? [
            ...intelligence
              .calculatedFields
          ]
        : [],

    extractedFields:
      Array.isArray(
        intelligence
          .extractedFields
      )
        ? [
            ...intelligence
              .extractedFields
          ]
        : [],

    inferredFields:
      Array.isArray(
        intelligence
          .inferredFields
      )
        ? [
            ...intelligence
              .inferredFields
          ]
        : [],
  };
}


// ============================================================
// MAP VALIDATION
// ============================================================

function mapValidation(
  canonicalLine
) {

  const validation =
    canonicalLine
      ?.validation ||
    {};


  return {

    valid:
      validation.valid !== false,

    requiresReview:
      Boolean(
        validation
          .requiresReview
      ),

    issues:
      Array.isArray(
        validation.issues
      )
        ? [
            ...validation
              .issues
          ]
        : [],
  };
}


// ============================================================
// MAP ONE CANONICAL LINE
// ============================================================

function mapCanonicalLine(
  canonicalLine,
  index = 0
) {

  if (
    !canonicalLine
  ) {
    return null;
  }


  const product =
    mapProduct(
      canonicalLine
    );

  const purchase =
    mapPurchase(
      canonicalLine
    );

  const tax =
    mapTax(
      canonicalLine
    );

  const totals =
    mapTotals(
      canonicalLine
    );


  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // invoiceAmount = amount extracted/resolved from invoice
  //
  // totalAmount = canonical calculated/resolved final amount
  //
  // These are intentionally kept separate.
  // ----------------------------------------------------------

  const invoiceAmount =
    totals.extractedAmount;

  const totalAmount =
    totals.totalAmount;


  const purchaseQuantity =
    numberOrZero(
      purchase.quantity
    );


  const purchaseRate =
    numberOrZero(
      purchase.purchaseRate
    );


  const discountAmount =
    numberOrZero(
      purchase.discountAmount
    );


  const taxableAmount =
    numberOrZero(
      totals.taxableAmount
    );


  return {

    // --------------------------------------------------------
    // IDENTIFICATION
    // --------------------------------------------------------

    id:
      canonicalLine.id ??
      `line-${index + 1}`,

    lineNumber:
      canonicalLine.lineNumber ??
      index + 1,

    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

    product,

    // --------------------------------------------------------
    // PURCHASE
    // --------------------------------------------------------

    purchase,

    // --------------------------------------------------------
    // TAX
    // --------------------------------------------------------

    tax,

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    totals,

    // --------------------------------------------------------
    // FRONTEND-FRIENDLY VALUES
    //
    // These make the review UI simple.
    // --------------------------------------------------------

    display: {

      productName:
        getValue(
          product.name
        ) || "",

      hsn:
        getValue(
          product.hsn
        ) || "",

      quantity:
        purchaseQuantity,

      unit:
        getValue(
          product.unit
        ) || "",

      purchaseRate,

      mrp:
        numberOrZero(
          product.mrp
        ),

      gstRate:
        numberOrZero(
          tax.gstRate
        ),

      discountRate:
        numberOrZero(
          purchase.discountRate
        ),

      discountAmount,

      taxableAmount,

      invoiceAmount:
        getValue(
          invoiceAmount
        ),

      totalAmount:
        getValue(
          totalAmount
        ),
    },

    // --------------------------------------------------------
    // AMOUNT MEANING
    // --------------------------------------------------------

    amountMeaning:
      canonicalLine
        .amountMeaning ||
      null,

    // --------------------------------------------------------
    // PRICING MODE
    // --------------------------------------------------------

    pricingMode:
      canonicalLine
        .pricingMode ||
      null,

    // --------------------------------------------------------
    // INTELLIGENCE
    // --------------------------------------------------------

    intelligence:
      mapIntelligence(
        canonicalLine
      ),

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    validation:
      mapValidation(
        canonicalLine
      ),

    // --------------------------------------------------------
    // ORIGINAL RAW LINE
    //
    // Keep it available for debugging/audit, but don't use
    // it as the source of truth in the frontend.
    // --------------------------------------------------------

    raw:
      canonicalLine.raw ??
      null,
  };
}


// ============================================================
// MAP HEADER
// ============================================================

function mapHeader(
  canonical
) {

  return {

    invoiceNumber:
      cloneResolvedField(
        canonical
          ?.invoiceNumber
      ),

    invoiceDate:
      cloneResolvedField(
        canonical
          ?.invoiceDate
      ),

    dueDate:
      cloneResolvedField(
        canonical
          ?.dueDate
      ),

    supplier: {

      id:
        canonical
          ?.supplier
          ?.id ??
        null,

      name:
        canonical
          ?.supplier
          ?.name ??
        "",

      gstin:
        canonical
          ?.supplier
          ?.gstin ??
        null,

      invoiceFormat:
        canonical
          ?.supplier
          ?.invoiceFormat ??
        null,
    },
  };
}


// ============================================================
// MAP INVOICE TOTALS
// ============================================================

function mapInvoiceTotals(
  canonical
) {

  const totals =
    canonical
      ?.totals ||
    {};


  return {

    taxableAmount:
      numberOrZero(
        totals.taxableAmount
      ),

    taxAmount:
      numberOrZero(
        totals.taxAmount
      ),

    totalAmount:
      numberOrZero(
        totals.totalAmount
      ),

    discountAmount:
      numberOrZero(
        totals.discountAmount
      ),
  };
}


// ============================================================
// MAP INVOICE INTELLIGENCE
// ============================================================

function mapInvoiceIntelligence(
  canonical
) {

  const intelligence =
    canonical
      ?.intelligence ||
    {};


  return {

    confidence:
      numberOrZero(
        intelligence.confidence
      ),

    requiresReview:
      Boolean(
        intelligence
          .requiresReview
      ),

    sourceFormat:
      intelligence
        .sourceFormat ??
      null,

    normalizedAt:
      intelligence
        .normalizedAt ??
      null,
  };
}


// ============================================================
// MAP INVOICE VALIDATION
// ============================================================

function mapInvoiceValidation(
  canonical
) {

  const validation =
    canonical
      ?.validation ||
    {};


  return {

    valid:
      validation.valid !== false,

    requiresReview:
      Boolean(
        validation
          .requiresReview
      ),

    issues:
      Array.isArray(
        validation.issues
      )
        ? [
            ...validation
              .issues
          ]
        : [],
  };
}


// ============================================================
// MAP CANONICAL INVOICE
// ============================================================

function mapCanonicalInvoice(
  canonical
) {

  if (
    !canonical
  ) {
    return null;
  }


  const canonicalLines =
    Array.isArray(
      canonical.lines
    )
      ? canonical.lines
      : [];


  const lines =
    canonicalLines
      .map(
        (
          line,
          index
        ) =>
          mapCanonicalLine(
            line,
            index
          )
      )
      .filter(
        Boolean
      );


  const totals =
    mapInvoiceTotals(
      canonical
    );


  return {

    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    header:
      mapHeader(
        canonical
      ),

    // --------------------------------------------------------
    // LINES
    // --------------------------------------------------------

    lines,

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    totals,

    // --------------------------------------------------------
    // PRICING
    // --------------------------------------------------------

    pricingMode:
      canonical
        .pricingMode ||
      null,

    // --------------------------------------------------------
    // INTELLIGENCE
    // --------------------------------------------------------

    intelligence:
      mapInvoiceIntelligence(
        canonical
      ),

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    validation:
      mapInvoiceValidation(
        canonical
      ),

    // --------------------------------------------------------
    // META
    // --------------------------------------------------------

    meta: {

      lineCount:
        lines.length,

      requiresReview:
        Boolean(
          canonical
            ?.validation
            ?.requiresReview
        ),

      source:
        "invoice-intelligence",
    },
  };
}


// ============================================================
// BULK FIELD UPDATE
// ============================================================
//
// Used by frontend/global editing.
//
// Example:
//
//   applyBulkEdit(
//      canonicalInvoice,
//      [1, 2, 3],
//      "product.hsn",
//      "0901"
//   )
//
// This function intentionally only changes the requested
// canonical field.
//
// Recalculation of dependent fields belongs to the resolver
// layer / review recalculation flow.
// ============================================================

function setNestedValue(
  object,
  path,
  value
) {

  const parts =
    String(path)
      .split(".")
      .filter(
        Boolean
      );


  if (
    parts.length === 0
  ) {
    return;
  }


  let current =
    object;


  for (
    let index = 0;
    index <
      parts.length - 1;
    index++
  ) {

    const key =
      parts[index];


    if (
      !current[key] ||
      typeof current[key] !==
        "object"
    ) {
      current[key] = {};
    }


    current =
      current[key];
  }


  const finalKey =
    parts[
      parts.length - 1
    ];


  current[finalKey] =
    value;
}


// ============================================================
// BULK EDIT
// ============================================================

function applyBulkEdit(
  canonicalInvoice,
  lineIndexes,
  fieldPath,
  value
) {

  if (
    !canonicalInvoice
  ) {
    return canonicalInvoice;
  }


  if (
    !Array.isArray(
      canonicalInvoice.lines
    )
  ) {
    return canonicalInvoice;
  }


  if (
    !Array.isArray(
      lineIndexes
    )
  ) {
    return canonicalInvoice;
  }


  const uniqueIndexes =
    [
      ...new Set(
        lineIndexes
          .map(
            Number
          )
          .filter(
            Number.isInteger
          )
      ),
    ];


  for (
    const index
    of uniqueIndexes
  ) {

    const line =
      canonicalInvoice
        .lines[index];


    if (
      !line
    ) {
      continue;
    }


    // --------------------------------------------------------
    // Convert primitive value into a ResolvedField.
    //
    // Existing metadata is preserved when possible.
    // --------------------------------------------------------

    const currentField =
      fieldPath
        .split(".")
        .reduce(
          (
            current,
            key
          ) =>
            current?.[key],
          line
        );


    const newField =
      makeField(
        value,

        FIELD_SOURCE.MANUAL,

        FIELD_METHOD.MANUAL,

        1,

        {
          reason:
            "Value manually edited by user",
        }
      );


    // --------------------------------------------------------
    // Write field
    // --------------------------------------------------------

    setNestedValue(
      line,
      fieldPath,
      newField
    );


    // --------------------------------------------------------
    // Track manual edit
    // --------------------------------------------------------

    if (
      !line.intelligence
    ) {
      line.intelligence =
        {};
    }


    if (
      !Array.isArray(
        line
          .intelligence
          .manuallyEditedFields
      )
    ) {
      line
        .intelligence
        .manuallyEditedFields =
        [];
    }


    if (
      !line
        .intelligence
        .manuallyEditedFields
        .includes(
          fieldPath
        )
    ) {

      line
        .intelligence
        .manuallyEditedFields
        .push(
          fieldPath
        );
    }


    // --------------------------------------------------------
    // Manual edit means this line needs review.
    // --------------------------------------------------------

    line
      .intelligence
      .requiresReview =
      true;


    // --------------------------------------------------------
    // Existing validation can no longer be considered final.
    // --------------------------------------------------------

    if (
      line.validation
    ) {

      line.validation =
        {
          ...line.validation,

          requiresReview:
            true,
        };
    }


    // Avoid unused variable warning in some lint setups.
    void currentField;
  }


  return canonicalInvoice;
}


// ============================================================
// BULK HSN
// ============================================================

function applyBulkHsn(
  canonicalInvoice,
  lineIndexes,
  hsn
) {

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "product.hsn",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "product.unit",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "tax.gstRate",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "purchase.purchaseRate",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "product.mrp",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "purchase.quantity",
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

  return applyBulkEdit(
    canonicalInvoice,
    lineIndexes,
    "purchase.discountRate",
    discountRate
  );
}


// ============================================================
// GET REVIEW SUMMARY
// ============================================================

function getReviewSummary(
  canonicalInvoice
) {

  const lines =
    Array.isArray(
      canonicalInvoice
        ?.lines
    )
      ? canonicalInvoice
          .lines
      : [];


  let requiresReview =
    0;

  let valid =
    0;

  let invalid =
    0;

  let warning =
    0;


  for (
    const line
    of lines
  ) {

    if (
      line
        ?.intelligence
        ?.requiresReview
    ) {
      requiresReview++;
    }


    if (
      line
        ?.validation
        ?.valid
    ) {
      valid++;
    } else {
      invalid++;
    }


    const issues =
      Array.isArray(
        line
          ?.validation
          ?.issues
      )
        ? line
            .validation
            .issues
        : [];


    if (
      issues.some(
        issue =>
          issue?.severity ===
          "warning"
      )
    ) {
      warning++;
    }
  }


  return {

    total:
      lines.length,

    valid,

    invalid,

    warning,

    requiresReview,

    canContinue:
      invalid === 0,
  };
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  getValue,

  getConfidence,

  getSource,

  getMethod,

  makeField,

  cloneResolvedField,

  numberOrZero,

  roundMoney,

  mapProduct,

  mapPurchase,

  mapTax,

  mapTotals,

  mapIntelligence,

  mapValidation,

  mapCanonicalLine,

  mapHeader,

  mapInvoiceTotals,

  mapInvoiceIntelligence,

  mapInvoiceValidation,

  mapCanonicalInvoice,

  setNestedValue,

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