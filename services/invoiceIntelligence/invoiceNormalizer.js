// ============================================================
// INVOICE NORMALIZER
// ============================================================
//
// Converts any supported raw invoice format into ONE canonical
// invoice structure.
//
// RAW INVOICE
//   -> fieldResolver
//   -> productResolver
//   -> taxResolver (rates)
//   -> amountResolver
//   -> taxResolver (amounts)
//   -> invoiceValidator
//   -> Canonical Invoice
//
// This file does NOT:
//   - call Petpooja
//   - write to database
//   - build purchase-bill payloads
//   - contain UI logic
// ============================================================

const {
  FIELD_SOURCE,
  FIELD_METHOD,
  PRICING_MODE,
  resolvedField,
  createEmptyCanonicalInvoice,
  createEmptyCanonicalLine,
  createNormalizationStats,
} = require("./canonicalTypes");

const {
  normalizeText,
  toNumber,
  resolveBasicProduct,
} = require("./fieldResolver");

const {
  resolveProduct,
  getProductConfidence,
} = require("./productResolver");

const {
  resolveTax,
  resolveLineTax,
} = require("./taxResolver");

const {
  resolveLineAmount,
} = require("./amountResolver");

const {
  validateInvoice,
  validateLine,
} = require("./invoiceValidator");


// ============================================================
// SAFE HELPERS
// ============================================================

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}


function firstValue(...sources) {
  for (const source of sources) {
    const object = safeObject(source);

    for (const key of Object.keys(object)) {
      const value = object[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
  }

  return null;
}


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


function numberOrZero(value) {
  const number = toNumber(
    getValue(value)
  );

  return number === null
    ? 0
    : number;
}


function roundMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;
}


// ============================================================
// RAW INVOICE CONTAINERS
// ============================================================

function getInvoiceContainers(rawInvoice) {
  const root =
    safeObject(rawInvoice);

  return [
    root,
    safeObject(root.data),
    safeObject(root.invoice),
    safeObject(root.document),
  ];
}


// ============================================================
// EXTRACT INVOICE LINES
// ============================================================

function extractInvoiceLines(rawInvoice) {
  const containers =
    getInvoiceContainers(
      rawInvoice
    );

  const keys = [
    "lineItems",
    "line_items",
    "items",
    "products",
    "invoiceItems",
    "invoice_items",
    "rows",
    "details",
    "productItems",
    "product_items",
  ];

  for (
    const container
    of containers
  ) {
    for (
      const key
      of keys
    ) {
      const value =
        container[key];

      if (
        Array.isArray(value) &&
        value.length > 0
      ) {
        return value;
      }
    }
  }

  return [];
}


// ============================================================
// SUPPLIER
// ============================================================

function resolveSupplier(
  rawInvoice
) {
  const containers =
    getInvoiceContainers(
      rawInvoice
    );

  let supplierObject = {};

  for (
    const container
    of containers
  ) {
    const candidate =
      container.supplier ||
      container.vendor ||
      container.seller ||
      container.party;

    if (
      candidate &&
      typeof candidate ===
        "object"
    ) {
      supplierObject =
        candidate;

      break;
    }
  }

  const name =
    supplierObject.name ||
    supplierObject.supplierName ||
    supplierObject.supplier_name ||
    supplierObject.vendorName ||
    supplierObject.vendor_name ||
    supplierObject.companyName ||
    supplierObject.company_name ||
    firstValue(
      ...containers.map(
        container => ({
          supplierName:
            container.supplierName,

          supplier_name:
            container.supplier_name,

          vendorName:
            container.vendorName,

          vendor_name:
            container.vendor_name,

          sellerName:
            container.sellerName,

          seller_name:
            container.seller_name,
        })
      )
    );

  const gstin =
    supplierObject.gstin ||
    supplierObject.gstNumber ||
    supplierObject.gst_number ||
    supplierObject.gstn ||
    supplierObject.gst ||
    firstValue(
      ...containers.map(
        container => ({
          supplierGstin:
            container.supplierGstin,

          supplier_gstin:
            container.supplier_gstin,

          vendorGstin:
            container.vendorGstin,

          vendor_gstin:
            container.vendor_gstin,

          sellerGstin:
            container.sellerGstin,

          seller_gstin:
            container.seller_gstin,
        })
      )
    );

  const id =
    supplierObject.id ??
    supplierObject.supplierId ??
    supplierObject.supplier_id ??
    supplierObject.partyId ??
    supplierObject.party_id ??
    null;

  return {
    id,

    name:
      normalizeText(
        name
      ) || "",

    gstin:
      normalizeText(
        gstin
      ) || null,

    raw:
      supplierObject,
  };
}


// ============================================================
// INVOICE NUMBER
// ============================================================

function resolveInvoiceNumber(
  rawInvoice
) {
  const containers =
    getInvoiceContainers(
      rawInvoice
    );

  const keys = [
    "invoiceNumber",
    "invoice_number",
    "invoiceNo",
    "invoice_no",
    "billNumber",
    "bill_number",
    "billNo",
    "bill_no",
    "voucherNumber",
    "voucher_number",
    "number",
  ];

  let value = null;
  let sourceField = null;

  for (
    const container
    of containers
  ) {
    for (
      const key
      of keys
    ) {
      if (
        container[key] !==
          undefined &&
        container[key] !==
          null &&
        String(
          container[key]
        ).trim() !== ""
      ) {
        value =
          container[key];

        sourceField =
          key;

        break;
      }
    }

    if (
      value !== null
    ) {
      break;
    }
  }

  return resolvedField(
    normalizeText(value),

    value !== null
      ? FIELD_SOURCE.INVOICE
      : FIELD_SOURCE.SYSTEM,

    value !== null
      ? FIELD_METHOD.EXTRACTED
      : FIELD_METHOD.DEFAULTED,

    value !== null
      ? 0.97
      : 0,

    {
      sourceField,
    }
  );
}


// ============================================================
// DATE
// ============================================================

function normalizeDate(
  value
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const text =
    String(value).trim();

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return text;
  }

  let match =
    text.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
    );

  if (match) {
    return (
      `${match[3]}-` +
      `${match[2].padStart(2, "0")}-` +
      `${match[1].padStart(2, "0")}`
    );
  }

  const date =
    new Date(text);

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return date
      .toISOString()
      .slice(0, 10);
  }

  return null;
}


// ============================================================
// RESOLVE DATE
// ============================================================

function resolveDate(
  rawInvoice,
  keys,
  confidence
) {
  const containers =
    getInvoiceContainers(
      rawInvoice
    );

  for (
    const container
    of containers
  ) {
    for (
      const key
      of keys
    ) {
      const value =
        container[key];

      const normalized =
        normalizeDate(value);

      if (normalized) {
        return resolvedField(
          normalized,

          FIELD_SOURCE.INVOICE,

          FIELD_METHOD.EXTRACTED,

          confidence,

          {
            sourceField:
              key,
          }
        );
      }
    }
  }

  return resolvedField(
    null,

    FIELD_SOURCE.SYSTEM,

    FIELD_METHOD.DEFAULTED,

    0
  );
}


// ============================================================
// INVOICE DATE
// ============================================================

function resolveInvoiceDate(
  rawInvoice
) {
  return resolveDate(
    rawInvoice,

    [
      "invoiceDate",
      "invoice_date",
      "billDate",
      "bill_date",
      "date",
      "documentDate",
      "document_date",
    ],

    0.95
  );
}


// ============================================================
// DUE DATE
// ============================================================

function resolveDueDate(
  rawInvoice
) {
  return resolveDate(
    rawInvoice,

    [
      "dueDate",
      "due_date",
      "paymentDueDate",
      "payment_due_date",
    ],

    0.90
  );
}


// ============================================================
// SOURCE FORMAT
// ============================================================

function resolveSourceFormat(
  rawInvoice
) {
  const containers =
    getInvoiceContainers(
      rawInvoice
    );

  const keys = [
    "invoiceFormat",
    "invoice_format",
    "template",
    "templateName",
    "template_name",
    "sourceFormat",
    "source_format",
  ];

  for (
    const container
    of containers
  ) {
    for (
      const key
      of keys
    ) {
      if (
        container[key] !==
          undefined &&
        container[key] !==
          null &&
        String(
          container[key]
        ).trim() !== ""
      ) {
        return normalizeText(
          container[key]
        );
      }
    }
  }

  return null;
}


// ============================================================
// BUILD CANONICAL LINE
// ============================================================

function buildCanonicalLine(
  rawLine,
  index,
  options = {}
) {
  const raw =
    safeObject(
      rawLine
    );

  // ----------------------------------------------------------
  // PRODUCT RESOLUTION
  // ----------------------------------------------------------

  const productResult =
    resolveProduct(
      raw,
      {
        productMasters:
          safeArray(
            options.productMasters
          ),

        historicalProducts:
          safeArray(
            options.historicalProducts
          ),

        productMaster:
          options.productMaster ||
          null,

        historicalProduct:
          options.historicalProduct ||
          null,

        supplier:
          options.supplier ||
          null,
      }
    );

  // ----------------------------------------------------------
  // FIELD RESOLUTION
  // ----------------------------------------------------------

  const basic =
    resolveBasicProduct(
      raw,
      {
        productMaster:
          productResult
            ?.match
            ?.productMaster ||
          options.productMaster ||
          null,

        historicalProduct:
          productResult
            ?.match
            ?.historicalProduct ||
          options.historicalProduct ||
          null,

        supplier:
          options.supplier ||
          null,
      }
    );

  const line =
    createEmptyCanonicalLine(
      index + 1,
      raw
    );

  // ----------------------------------------------------------
  // PRODUCT
  // ----------------------------------------------------------

  line.product = {

    id:
      productResult
        ?.product
        ?.id ||
      resolvedField(
        null,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.DEFAULTED,
        0
      ),

    name:
      productResult
        ?.product
        ?.name ||
      basic.product.name,

    code:
      productResult
        ?.product
        ?.code ||
      basic.product.code,

    hsn:
      productResult
        ?.product
        ?.hsn ||
      basic.product.hsn,

    unit:
      productResult
        ?.product
        ?.unit ||
      basic.product.unit,

    mrp:
      productResult
        ?.product
        ?.mrp ||
      basic.product.mrp,

    barcode:
      productResult
        ?.product
        ?.barcode ||
      basic.product.barcode,
  };


  // ----------------------------------------------------------
  // TAX RATES
  // ----------------------------------------------------------

  const taxRates =
    resolveTax(
      raw,

      productResult
        ?.match
        ?.productMaster ||
        null,

      options.supplier ||
        null
    );


  // ----------------------------------------------------------
  // PURCHASE
  // ----------------------------------------------------------

  line.purchase = {

    quantity:
      basic.purchase.quantity,

    purchaseRate:
      basic.purchase.purchaseRate,

    discountRate:
      basic.purchase.discountRate,

    discountAmount:
      basic.purchase.discountAmount,

    taxableAmount:
      basic.purchase
        .extractedTaxableAmount,
  };


  // ----------------------------------------------------------
  // TAX
  // ----------------------------------------------------------

  line.tax = {

    gstRate:
      taxRates.gstRate,

    cgstRate:
      taxRates.cgstRate,

    sgstRate:
      taxRates.sgstRate,

    igstRate:
      taxRates.igstRate,

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


  // ----------------------------------------------------------
  // PRICING MODE
  // ----------------------------------------------------------

  line.pricingMode =
    basic.pricingMode ||
    PRICING_MODE.UNKNOWN;


  // ----------------------------------------------------------
  // TOTALS
  // ----------------------------------------------------------

  line.totals = {

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
      basic.extractedAmount,
  };


  // ----------------------------------------------------------
  // INTELLIGENCE
  // ----------------------------------------------------------

  const productConfidence =
    getProductConfidence(
      productResult
    );

  line.intelligence = {

    confidence:
      productConfidence,

    requiresReview:
      productConfidence < 0.85,

    manuallyEditedFields:
      [],

    calculatedFields:
      [],

    extractedFields:
      [],

    inferredFields:
      [],
  };


  return {

    raw,

    basic,

    productResult,

    canonical:
      line,

  };
}


// ============================================================
// APPLY AMOUNT RESOLUTION
// ============================================================

function applyAmountResolution(
  lineResults,
  options = {}
) {
  const amountResults = [];

  for (
    const result
    of lineResults
  ) {
    const line =
      result.canonical;

    const basic =
      result.basic;


    // amountResolver expects
    // fieldResolver-shaped data.

    const amountInput = {

      ...basic,

      product:
        line.product,

      purchase: {
        ...basic.purchase,
      },

      tax: {

        ...basic.tax,

        gstRate:
          line.tax.gstRate,

        cgstRate:
          line.tax.cgstRate,

        sgstRate:
          line.tax.sgstRate,

        igstRate:
          line.tax.igstRate,
      },

      pricingMode:
        line.pricingMode,

      extractedAmount:
        basic.extractedAmount,
    };


    const amountResult =
      resolveLineAmount(
        amountInput,
        options
      );


    amountResults.push(
      amountResult
    );


    if (
      !amountResult
    ) {
      continue;
    }


    const calculated =
      amountResult.calculated ||
      {};

    const resolved =
      amountResult.resolved ||
      {};


    // --------------------------------------------------------
    // PURCHASE TAXABLE
    // --------------------------------------------------------

    line.purchase
      .taxableAmount =
      resolved.taxableAmount ||
      resolvedField(
        calculated.taxableAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        calculated.taxableAmount !==
          null
          ? 0.98
          : 0
      );


    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    line.totals
      .taxableAmount =
      resolved.taxableAmount ||
      resolvedField(
        calculated.taxableAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        calculated.taxableAmount !==
          null
          ? 0.98
          : 0
      );


    line.totals
      .taxAmount =
      resolved.gstAmount ||
      resolvedField(
        calculated.gstAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        calculated.gstAmount !==
          null
          ? 0.98
          : 0
      );


    line.totals
      .totalAmount =
      resolved.totalAmount ||
      resolvedField(
        calculated.totalAmount,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        calculated.totalAmount !==
          null
          ? 0.98
          : 0
      );


    // --------------------------------------------------------
    // INTELLIGENCE
    // --------------------------------------------------------

    line.intelligence = {

      ...line.intelligence,

      confidence:
        Math.max(
          numberOrZero(
            line.intelligence
              .confidence
          ),

          numberOrZero(
            amountResult.confidence
          )
        ),

      requiresReview:
        line.intelligence
          .requiresReview ||
        !amountResult
          .validation
          ?.valid ||
        !amountResult
          .validation
          ?.amountMatched,

      calculatedFields: [
        ...new Set([
          ...(
            line.intelligence
              .calculatedFields ||
            []
          ),

          "taxableAmount",

          "gstAmount",

          "totalAmount",
        ]),
      ],

      extractedFields:
        collectExtractedFields(
          result.raw
        ),
    };


    // --------------------------------------------------------
    // AMOUNT VALIDATION
    // --------------------------------------------------------

    if (
      amountResult.validation
    ) {
      line.validation = {

        valid:
          amountResult
            .validation
            .valid,

        issues:
          amountResult
            .validation
            .issues ||
          [],
      };
    }


    // --------------------------------------------------------
    // AMOUNT MEANING
    // --------------------------------------------------------

    line.amountMeaning =
      amountResult
        .amountMeaning ||
      null;
  }

  return amountResults;
}


// ============================================================
// FINAL TAX AMOUNT RESOLUTION
// ============================================================

function applyFinalTaxResolution(
  lineResults,
  options = {}
) {
  for (
    const result
    of lineResults
  ) {
    const line =
      result.canonical;


    const taxResult =
      resolveLineTax(
        result.raw,
        {
          ...options,

          canonicalLine:
            line,

          productMaster:
            result
              .productResult
              ?.match
              ?.productMaster ||
            null,

          supplier:
            options.supplier ||
            null,
        }
      );


    if (
      !taxResult
    ) {
      continue;
    }


    line.tax.gstRate =
      taxResult.gstRate;

    line.tax.cgstRate =
      taxResult.cgstRate;

    line.tax.sgstRate =
      taxResult.sgstRate;

    line.tax.igstRate =
      taxResult.igstRate;


    line.tax.gstAmount =
      taxResult.gstAmount;

    line.tax.cgstAmount =
      taxResult.cgstAmount;

    line.tax.sgstAmount =
      taxResult.sgstAmount;

    line.tax.igstAmount =
      taxResult.igstAmount;


    const gstAmount =
      numberOrZero(
        taxResult.gstAmount
      );

    const cgstAmount =
      numberOrZero(
        taxResult.cgstAmount
      );

    const sgstAmount =
      numberOrZero(
        taxResult.sgstAmount
      );

    const igstAmount =
      numberOrZero(
        taxResult.igstAmount
      );


    const totalTax =
      gstAmount > 0
        ? gstAmount
        : roundMoney(
            cgstAmount +
            sgstAmount +
            igstAmount
          );


    line.totals.taxAmount =
      resolvedField(
        totalTax,
        FIELD_SOURCE.SYSTEM,
        FIELD_METHOD.CALCULATED,
        0.98,
        {
          reason:
            "Calculated from final taxable amount and resolved GST rates",
        }
      );
  }
}


// ============================================================
// COLLECT EXTRACTED FIELDS
// ============================================================

function collectExtractedFields(
  object
) {
  const fields = [];

  function walk(
    value,
    prefix = ""
  ) {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return;
    }


    if (
      Object.prototype.hasOwnProperty.call(
        value,
        "method"
      ) &&
      value.method ===
        FIELD_METHOD.EXTRACTED
    ) {
      if (prefix) {
        fields.push(
          prefix
        );
      }

      return;
    }


    for (
      const [
        key,
        child,
      ] of Object.entries(
        value
      )
    ) {
      const path =
        prefix
          ? `${prefix}.${key}`
          : key;

      walk(
        child,
        path
      );
    }
  }


  walk(object);

  return fields;
}


// ============================================================
// INVOICE TOTALS
// ============================================================

function calculateInvoiceTotals(
  lines
) {
  let taxableAmount = 0;
  let taxAmount = 0;
  let totalAmount = 0;
  let discountAmount = 0;
  let extractedAmount = 0;

  let hasTaxable = false;
  let hasTotal = false;
  let hasExtracted = false;


  for (
    const line
    of safeArray(lines)
  ) {
    const taxable =
      getValue(
        line
          ?.totals
          ?.taxableAmount
      );

    const tax =
      getValue(
        line
          ?.totals
          ?.taxAmount
      );

    const total =
      getValue(
        line
          ?.totals
          ?.totalAmount
      );

    const extracted =
      getValue(
        line
          ?.totals
          ?.extractedAmount
      );

    const discount =
      getValue(
        line
          ?.purchase
          ?.discountAmount
      );


    if (
      taxable !== null &&
      taxable !== undefined
    ) {
      taxableAmount +=
        numberOrZero(
          taxable
        );

      hasTaxable = true;
    }


    if (
      tax !== null &&
      tax !== undefined
    ) {
      taxAmount +=
        numberOrZero(
          tax
        );
    }


    if (
      total !== null &&
      total !== undefined
    ) {
      totalAmount +=
        numberOrZero(
          total
        );

      hasTotal = true;
    }


    if (
      extracted !== null &&
      extracted !== undefined
    ) {
      extractedAmount +=
        numberOrZero(
          extracted
        );

      hasExtracted = true;
    }


    discountAmount +=
      numberOrZero(
        discount
      );
  }


  return {

    taxableAmount:
      hasTaxable
        ? roundMoney(
            taxableAmount
          )
        : null,

    taxAmount:
      hasTaxable
        ? roundMoney(
            taxAmount
          )
        : null,

    totalAmount:
      hasTotal
        ? roundMoney(
            totalAmount
          )
        : null,

    discountAmount:
      roundMoney(
        discountAmount
      ),

    extractedAmount:
      hasExtracted
        ? roundMoney(
            extractedAmount
          )
        : null,
  };
}


// ============================================================
// STATS
// ============================================================

function calculateStats(
  lines
) {
  const stats =
    createNormalizationStats();

  stats.totalLines =
    safeArray(lines).length;


  for (
    const line
    of safeArray(lines)
  ) {
    const issues =
      safeArray(
        line
          ?.validation
          ?.issues
      );


    const hasError =
      issues.some(
        item =>
          item.severity ===
          "error"
      );


    const hasWarning =
      issues.some(
        item =>
          item.severity ===
          "warning"
      );


    if (!hasError) {
      stats.validLines++;
    }

    if (hasWarning) {
      stats.warningLines++;
    }

    if (hasError) {
      stats.errorLines++;
    }


    if (
      !getValue(
        line
          ?.product
          ?.hsn
      )
    ) {
      stats.missingHsn++;
    }


    if (
      !getValue(
        line
          ?.product
          ?.unit
      )
    ) {
      stats.missingUnit++;
    }


    if (
      issues.some(
        item =>
          item.code ===
          "AMOUNT_MISMATCH"
      )
    ) {
      stats.amountMismatches++;
    }


    if (
      (
        line
          ?.intelligence
          ?.calculatedFields ||
        []
      ).length > 0
    ) {
      stats.calculatedAmounts++;
    }


    if (
      line
        ?.intelligence
        ?.requiresReview
    ) {
      stats.manuallyRequired++;
    }
  }


  return stats;
}


// ============================================================
// LINE VALIDATION
// ============================================================

function applyLineValidation(
  lines,
  options = {}
) {
  return safeArray(lines)
    .map(
      (
        line,
        index
      ) => {

        try {

          const validation =
            validateLine(
              line,
              index,
              options
            );


          line.validation = {

            valid:
              Boolean(
                validation
                  ?.valid
              ),

            issues:
              safeArray(
                validation
                  ?.issues
              ),
          };


          if (
            !validation?.valid ||
            validation
              ?.requiresReview
          ) {
            line.intelligence = {

              ...line.intelligence,

              requiresReview:
                true,
            };
          }

        } catch (
          error
        ) {

          line.validation = {

            valid: false,

            issues: [
              {
                code:
                  "VALIDATION_ERROR",

                severity:
                  "error",

                message:
                  error.message,
              },
            ],
          };


          line.intelligence = {

            ...line.intelligence,

            requiresReview:
              true,
          };
        }


        return line;
      }
    );
}


// ============================================================
// NORMALIZE ONE INVOICE
// ============================================================

function normalizeInvoice(
  rawInvoice,
  options = {}
) {
  const raw =
    safeObject(
      rawInvoice
    );


  const canonical =
    createEmptyCanonicalInvoice(
      raw
    );


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  canonical.invoiceNumber =
    resolveInvoiceNumber(
      raw
    );

  canonical.invoiceDate =
    resolveInvoiceDate(
      raw
    );

  canonical.dueDate =
    resolveDueDate(
      raw
    );


  // ----------------------------------------------------------
  // SUPPLIER
  // ----------------------------------------------------------

  const supplier =
    resolveSupplier(
      raw
    );


  canonical.supplier = {

    id:
      supplier.id,

    name:
      supplier.name,

    gstin:
      supplier.gstin,

    invoiceFormat:
      resolveSourceFormat(
        raw
      ),
  };


  // ----------------------------------------------------------
  // INTELLIGENCE
  // ----------------------------------------------------------

  canonical.intelligence = {

    ...canonical.intelligence,

    confidence:
      0,

    sourceFormat:
      resolveSourceFormat(
        raw
      ),

    normalizedAt:
      new Date().toISOString(),
  };


  // ----------------------------------------------------------
  // RAW LINES
  // ----------------------------------------------------------

  const rawLines =
    extractInvoiceLines(
      raw
    );


  // ----------------------------------------------------------
  // BUILD LINES
  // ----------------------------------------------------------

  const lineResults =
    rawLines.map(
      (
        rawLine,
        index
      ) =>
        buildCanonicalLine(
          rawLine,
          index,
          {

            ...options,

            supplier:
              options.supplier ||
              supplier,

            productMasters:
              options.productMasters ||
              [],

            historicalProducts:
              options.historicalProducts ||
              [],
          }
        )
    );


  // ----------------------------------------------------------
  // AMOUNT
  //
  // Tax RATE is already resolved in buildCanonicalLine.
  // amountResolver now determines:
  //
  // base
  // discount
  // taxable
  // GST
  // total
  // amount meaning
  // ----------------------------------------------------------

  const amountResults =
    applyAmountResolution(
      lineResults,
      options
    );


  // ----------------------------------------------------------
  // FINAL TAX AMOUNTS
  //
  // This happens AFTER amountResolver because now we know
  // the final taxable amount.
  // ----------------------------------------------------------

  applyFinalTaxResolution(
    lineResults,
    {
      ...options,

      supplier,
    }
  );


  // ----------------------------------------------------------
  // CANONICAL LINES
  // ----------------------------------------------------------

  let lines =
    lineResults.map(
      result =>
        result.canonical
    );


  // ----------------------------------------------------------
  // FINAL LINE VALIDATION
  // ----------------------------------------------------------

  lines =
    applyLineValidation(
      lines,
      options
    );


  canonical.lines =
    lines;


  // ----------------------------------------------------------
  // PRICING MODE
  // ----------------------------------------------------------

  const pricingModes =
    lines
      .map(
        line =>
          line.pricingMode
      )
      .filter(
        mode =>
          mode &&
          mode !==
            PRICING_MODE.UNKNOWN
      );


  canonical.pricingMode =
    pricingModes[0] ||
    PRICING_MODE.UNKNOWN;


  // ----------------------------------------------------------
  // INVOICE TOTALS
  // ----------------------------------------------------------

  const calculatedTotals =
    calculateInvoiceTotals(
      lines
    );


  canonical.totals = {

    ...canonical.totals,

    taxableAmount:
      calculatedTotals
        .taxableAmount ??
      0,

    taxAmount:
      calculatedTotals
        .taxAmount ??
      0,

    totalAmount:
      calculatedTotals
        .totalAmount ??
      0,

    discountAmount:
      calculatedTotals
        .discountAmount ??
      0,
  };


  // ----------------------------------------------------------
  // INVOICE VALIDATION
  // ----------------------------------------------------------

  let invoiceValidation;


  try {

    invoiceValidation =
      validateInvoice(
        canonical,
        options
      );

  } catch (
    error
  ) {

    invoiceValidation = {

      valid: false,

      requiresReview:
        true,

      issues: [
        {
          code:
            "INVOICE_VALIDATION_ERROR",

          severity:
            "error",

          message:
            error.message,
        },
      ],
    };
  }


  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------

  const stats =
    calculateStats(
      lines
    );


  // ----------------------------------------------------------
  // ALL ISSUES
  // ----------------------------------------------------------

  const allIssues = [

    ...lines.flatMap(
      line =>
        safeArray(
          line
            ?.validation
            ?.issues
        )
    ),

    ...safeArray(
      invoiceValidation
        ?.issues
    ),
  ];


  const hasError =
    allIssues.some(
      item =>
        item.severity ===
        "error"
    );


  const hasWarning =
    allIssues.some(
      item =>
        item.severity ===
        "warning"
    );


  // ----------------------------------------------------------
  // FINAL VALIDATION
  // ----------------------------------------------------------

  canonical.validation = {

    valid:
      Boolean(
        invoiceValidation
          ?.valid
      ) &&
      !hasError,

    requiresReview:
      hasError ||
      hasWarning ||
      Boolean(
        invoiceValidation
          ?.requiresReview
      ) ||
      stats.manuallyRequired >
        0,

    issues:
      allIssues,
  };


  // ----------------------------------------------------------
  // OVERALL CONFIDENCE
  // ----------------------------------------------------------

  if (
    lines.length === 0
  ) {

    canonical
      .intelligence
      .confidence = 0;

  } else {

    const totalConfidence =
      lines.reduce(
        (
          sum,
          line
        ) =>
          sum +
          numberOrZero(
            line
              ?.intelligence
              ?.confidence
          ),

        0
      );


    canonical
      .intelligence
      .confidence =
      Number(
        (
          totalConfidence /
          lines.length
        ).toFixed(3)
      );
  }


  canonical.intelligence = {

    ...canonical.intelligence,

    requiresReview:
      canonical
        .validation
        .requiresReview,
  };


  // ----------------------------------------------------------
  // RESULT
  // ----------------------------------------------------------

  return {

    success: true,

    canonical,

    stats,

    amountResults,

    validation:
      invoiceValidation,
  };
}


// ============================================================
// NORMALIZE MULTIPLE INVOICES
// ============================================================

function normalizeInvoices(
  invoices = [],
  options = {}
) {
  return safeArray(
    invoices
  ).map(
    invoice =>
      normalizeInvoice(
        invoice,
        options
      )
  );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  safeArray,

  safeObject,

  getValue,

  extractInvoiceLines,

  resolveSupplier,

  resolveInvoiceNumber,

  normalizeDate,

  resolveInvoiceDate,

  resolveDueDate,

  resolveSourceFormat,

  buildCanonicalLine,

  applyAmountResolution,

  applyFinalTaxResolution,

  collectExtractedFields,

  calculateInvoiceTotals,

  calculateStats,

  applyLineValidation,

  normalizeInvoice,

  normalizeInvoices,

};