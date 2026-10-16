// ============================================================
// INTELLIGENT INVOICE FIELD RESOLVER
// ============================================================
//
// Raw invoice formats can be different:
//
//   quantity
//   qty
//   invoice_quantity
//
//   rate
//   purchase_rate
//   unit_price
//
//   hsn
//   hsn_code
//
//   amount
//   total_amount
//   net_amount
//
// This file converts those different representations into
// consistent resolved values.
//
// IMPORTANT:
// This file resolves fields.
// It does NOT decide the final invoice amount.
//
// Amount calculation / validation will be handled separately.
// ============================================================

const {
  FIELD_SOURCE,
  FIELD_METHOD,
  PRICING_MODE,
  resolvedField,
} = require("./canonicalTypes");


// ============================================================
// BASIC HELPERS
// ============================================================

function isEmpty(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  if (
    typeof value === "string"
  ) {
    return value.trim() === "";
  }

  return false;
}


// ============================================================
// NUMBER PARSER
// ============================================================
//
// Handles:
//
// "1,250.50"
// "₹1,250.50"
// "5%"
// 1250.50
//
// Returns null when the value cannot be converted.
// ============================================================

function toNumber(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {

    return Number.isFinite(value)
      ? value
      : null;

  }

  let text =
    String(value)
      .trim();

  if (!text) {
    return null;
  }

  // Remove commas
  text =
    text.replace(
      /,/g,
      ""
    );

  // Remove currency symbols
  text =
    text.replace(
      /₹|\$|€|£/g,
      ""
    );

  // Remove percentage sign
  text =
    text.replace(
      /%/g,
      ""
    );

  // Keep numbers, decimal and minus
  text =
    text.replace(
      /[^0-9.-]/g,
      ""
    );

  if (!text) {
    return null;
  }

  const number =
    Number(text);

  return Number.isFinite(number)
    ? number
    : null;
}


// ============================================================
// TEXT NORMALIZATION
// ============================================================

function normalizeText(value) {

  if (
    isEmpty(value)
  ) {
    return null;
  }

  return String(value)
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


// ============================================================
// NORMALIZE PRODUCT NAME FOR MATCHING
// ============================================================

function normalizeProductName(
  value
) {

  const text =
    normalizeText(value);

  if (!text) {
    return "";
  }

  return text
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


// ============================================================
// UNIT NORMALIZATION
// ============================================================
//
// Examples:
//
// PCS
// PC
// PIECES
// NOS
//
// all become PCS.
//
// This can later be replaced/extended with your Petpooja
// unit master.
// ============================================================

function normalizeUnit(value) {

  const text =
    normalizeText(value);

  if (!text) {
    return null;
  }

  const normalized =
    text
      .toUpperCase()
      .replace(
        /[().]/g,
        ""
      )
      .trim();


  const aliases = {

    PCS:
      "PCS",

    PC:
      "PCS",

    PIECE:
      "PCS",

    PIECES:
      "PCS",

    NOS:
      "PCS",

    NO:
      "PCS",


    UNT:
      "UNT",

    UNIT:
      "UNT",

    UNITS:
      "UNT",


    PKT:
      "PKT",

    PACKET:
      "PKT",

    PACKETS:
      "PKT",


    PAC:
      "PAC",

    PACK:
      "PAC",


    BOX:
      "BOX",

    BOXES:
      "BOX",


    BTL:
      "BTL",

    BOTTLE:
      "BTL",

    BOTTLES:
      "BTL",


    KG:
      "KG",

    KGS:
      "KG",

    KILOGRAM:
      "KG",

    KILOGRAMS:
      "KG",


    GM:
      "GM",

    G:
      "GM",

    GRAM:
      "GM",

    GRAMS:
      "GM",

    GMS:
      "GM",


    MG:
      "MG",


    LTR:
      "LTR",

    L:
      "LTR",

    LITRE:
      "LTR",

    LITER:
      "LTR",

    LITRES:
      "LTR",

    LITERS:
      "LTR",


    ML:
      "ML",


    DOZ:
      "DOZ",

    DOZEN:
      "DOZ",

  };


  return (
    aliases[normalized] ||
    normalized
  );
}


// ============================================================
// CONFIDENCE LEVEL
// ============================================================

function getConfidenceLevel(
  confidence
) {

  const value =
    Number(confidence) || 0;


  if (
    value >= 0.90
  ) {
    return "high";
  }


  if (
    value >= 0.70
  ) {
    return "medium";
  }


  if (
    value > 0
  ) {
    return "low";
  }


  return "missing";
}


// ============================================================
// RESOLVED FIELD CREATOR
// ============================================================

function makeResolved(
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


  return resolvedField(
    value,
    source,
    method,
    safeConfidence,
    {

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

    }
  );
}


// ============================================================
// GET RAW FIELD
// ============================================================
//
// Supplier-specific mapping gets priority.
//
// Example:
//
// supplier.fieldMappings = {
//
//   quantity: "invoice_qty",
//
//   purchaseRate: "unit_cost"
//
// }
// ============================================================

function getMappedValue(
  raw,
  field,
  supplier
) {

  raw =
    raw &&
    typeof raw === "object"
      ? raw
      : {};


  const supplierMapping =
    supplier
      ?.fieldMappings
      ?. [field];


  if (
    supplierMapping &&
    !isEmpty(
      raw[supplierMapping]
    )
  ) {

    return {

      value:
        raw[supplierMapping],

      sourceField:
        supplierMapping,

    };

  }


  const aliases = {

    name: [

      "product",

      "product_name",

      "productName",

      "item",

      "item_name",

      "itemName",

      "description",

      "item_description",

      "itemDescription",

      "name",

    ],


    code: [

      "item_code",

      "itemCode",

      "product_code",

      "productCode",

      "sku",

      "code",

    ],


    hsn: [

      "hsn",

      "hsn_code",

      "hsnCode",

      "hsn_sac",

      "hsn_number",

      "hsnNumber",

      "hsn_sac_code",

    ],


    quantity: [

      "quantity",

      "qty",

      "invoice_quantity",

      "invoiceQuantity",

      "item_quantity",

      "itemQuantity",

      "purchase_quantity",

      "purchaseQuantity",

    ],


    unit: [

      "unit",

      "uom",

      "UOM",

      "unit_name",

      "unitName",

      "measurement_unit",

      "measurementUnit",

    ],


    purchaseRate: [

      "purchase_rate",

      "purchaseRate",

      "rate",

      "unit_price",

      "unitPrice",

      "price",

      "purchase_price",

      "purchasePrice",

      "cost",

      "unit_cost",

      "unitCost",

    ],


    mrp: [

      "mrp",

      "MRP",

      "maximum_retail_price",

      "maximumRetailPrice",

      "retail_price",

      "retailPrice",

    ],


    gstRate: [

      "gst_rate",

      "gstRate",

      "gst",

      "tax_rate",

      "taxRate",

      "total_gst_rate",

      "totalGstRate",

    ],


    cgstRate: [

      "cgst_rate",

      "cgstRate",

      "cgst",

    ],


    sgstRate: [

      "sgst_rate",

      "sgstRate",

      "sgst",

    ],


    igstRate: [

      "igst_rate",

      "igstRate",

      "igst",

    ],


    taxableAmount: [

      "taxable_amount",

      "taxableAmount",

      "taxable_value",

      "taxableValue",

      "net_amount",

      "netAmount",

      "net_value",

      "netValue",

    ],


    amount: [

      "amount",

      "line_amount",

      "lineAmount",

      "total_amount",

      "totalAmount",

      "line_total",

      "lineTotal",

      "gross_amount",

      "grossAmount",

      "final_amount",

      "finalAmount",

    ],


    discountRate: [

      "discount_rate",

      "discountRate",

      "discount_percent",

      "discountPercent",

      "discount_percentage",

      "discountPercentage",

    ],


    discountAmount: [

      "discount_amount",

      "discountAmount",

      "discount_value",

      "discountValue",

    ],


    barcode: [

      "barcode",

      "bar_code",

      "barCode",

      "ean",

      "ean_code",

      "eanCode",

      "upc",

    ],

  };


  const fields =
    aliases[field] || [];


  for (
    const candidate
    of fields
  ) {

    if (
      !isEmpty(
        raw[candidate]
      )
    ) {

      return {

        value:
          raw[candidate],

        sourceField:
          candidate,

      };

    }

  }


  return {

    value:
      null,

    sourceField:
      null,

  };

}


// ============================================================
// FIND PRODUCT MASTER
// ============================================================

function findProductMaster(
  raw,
  products = []
) {

  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return null;
  }


  const nameField =
    getMappedValue(
      raw,
      "name"
    );


  const codeField =
    getMappedValue(
      raw,
      "code"
    );


  const rawName =
    normalizeProductName(
      nameField.value
    );


  const rawCode =
    normalizeProductName(
      codeField.value
    );


  // ----------------------------------------------------------
  // CODE MATCH
  // ----------------------------------------------------------

  if (rawCode) {

    const codeMatch =
      products.find(
        product => {

          const productCode =
            normalizeProductName(
              product.itemCode ||
              product.code ||
              ""
            );

          return (
            productCode &&
            productCode === rawCode
          );

        }
      );


    if (codeMatch) {
      return codeMatch;
    }

  }


  // ----------------------------------------------------------
  // EXACT NAME MATCH
  // ----------------------------------------------------------

  if (rawName) {

    const exactNameMatch =
      products.find(
        product => {

          const masterName =
            normalizeProductName(
              product.canonicalName ||
              product.name ||
              ""
            );

          return (
            masterName &&
            masterName === rawName
          );

        }
      );


    if (exactNameMatch) {
      return exactNameMatch;
    }

  }


  // ----------------------------------------------------------
  // ALIAS MATCH
  // ----------------------------------------------------------

  if (rawName) {

    const aliasMatch =
      products.find(
        product => {

          const aliases =
            Array.isArray(
              product.aliases
            )
              ? product.aliases
              : [];


          return aliases.some(
            alias =>
              normalizeProductName(
                alias
              ) === rawName
          );

        }
      );


    if (aliasMatch) {
      return aliasMatch;
    }

  }


  return null;
}


// ============================================================
// RESOLVE PRODUCT NAME
// ============================================================

function resolveProductName(
  raw,
  productMaster
) {

  const extracted =
    getMappedValue(
      raw,
      "name"
    );


  const value =
    normalizeText(
      extracted.value
    );


  if (value) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.98,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  if (
    productMaster?.canonicalName
  ) {

    return makeResolved(
      productMaster.canonicalName,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.90,
      {

        reason:
          "Product name resolved from product master",

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {

      reason:
        "Product name is missing",

    }
  );

}


// ============================================================
// RESOLVE PRODUCT CODE
// ============================================================

function resolveProductCode(
  raw,
  productMaster
) {

  const extracted =
    getMappedValue(
      raw,
      "code"
    );


  const value =
    normalizeText(
      extracted.value
    );


  if (value) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.97,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  if (
    productMaster?.itemCode
  ) {

    return makeResolved(
      productMaster.itemCode,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.90
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// HSN RESOLVER
// ============================================================
//
// Priority:
//
// 1. Invoice
// 2. Product master
// 3. Historical product
// 4. Missing
//
// If invoice and product master disagree,
// invoice wins but warning is added.
// ============================================================

function resolveHSN(
  raw,
  productMaster,
  historicalProduct
) {

  const extracted =
    getMappedValue(
      raw,
      "hsn"
    );


  const invoiceHSN =
    normalizeText(
      extracted.value
    );


  const masterHSN =
    normalizeText(
      productMaster?.hsn
    );


  const historicalHSN =
    normalizeText(
      historicalProduct?.hsn
    );


  if (invoiceHSN) {

    const warnings = [];


    if (
      masterHSN &&
      masterHSN !== invoiceHSN
    ) {

      warnings.push(
        `Invoice HSN ${invoiceHSN} differs from product master HSN ${masterHSN}`
      );

    }


    return makeResolved(
      invoiceHSN,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.98,
      {

        sourceField:
          extracted.sourceField,

        warnings,

      }
    );

  }


  if (masterHSN) {

    return makeResolved(
      masterHSN,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.95,
      {

        reason:
          "HSN resolved from product master",

      }
    );

  }


  if (historicalHSN) {

    return makeResolved(
      historicalHSN,
      FIELD_SOURCE.HISTORY,
      FIELD_METHOD.RESOLVED,
      0.82,
      {

        reason:
          "HSN resolved from historical product data",

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {

      reason:
        "HSN is missing",

    }
  );

}


// ============================================================
// QUANTITY
// ============================================================

function resolveQuantity(
  raw
) {

  const extracted =
    getMappedValue(
      raw,
      "quantity"
    );


  const quantity =
    toNumber(
      extracted.value
    );


  if (
    quantity !== null &&
    quantity >= 0
  ) {

    return makeResolved(
      quantity,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.98,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {

      reason:
        "Quantity is missing or invalid",

    }
  );

}


// ============================================================
// UNIT
// ============================================================

function resolveUnit(
  raw,
  productMaster,
  supplier
) {

  const extracted =
    getMappedValue(
      raw,
      "unit",
      supplier
    );


  const invoiceUnit =
    normalizeUnit(
      extracted.value
    );


  if (invoiceUnit) {

    return makeResolved(
      invoiceUnit,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  const masterUnit =
    normalizeUnit(
      productMaster?.defaultUnit ||
      productMaster?.unit
    );


  if (masterUnit) {

    return makeResolved(
      masterUnit,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.93,
      {

        reason:
          "Unit resolved from product master",

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {

      reason:
        "Unit is missing",

    }
  );

}


// ============================================================
// PURCHASE RATE
// ============================================================

function resolvePurchaseRate(
  raw
) {

  const extracted =
    getMappedValue(
      raw,
      "purchaseRate"
    );


  const rate =
    toNumber(
      extracted.value
    );


  if (
    rate !== null &&
    rate >= 0
  ) {

    return makeResolved(
      rate,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.97,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0,
    {

      reason:
        "Purchase rate is missing",

    }
  );

}


// ============================================================
// MRP
// ============================================================

function resolveMRP(
  raw,
  productMaster
) {

  const extracted =
    getMappedValue(
      raw,
      "mrp"
    );


  const mrp =
    toNumber(
      extracted.value
    );


  if (
    mrp !== null &&
    mrp >= 0
  ) {

    return makeResolved(
      mrp,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.96,
      {

        sourceField:
          extracted.sourceField,

      }
    );

  }


  const masterMRP =
    toNumber(
      productMaster?.mrp
    );


  if (
    masterMRP !== null
  ) {

    return makeResolved(
      masterMRP,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.90,
      {

        reason:
          "MRP resolved from product master",

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// GST RATE
// ============================================================
//
// Priority:
//
// 1. Direct GST
// 2. CGST + SGST
// 3. IGST
// 4. Product master
// 5. Supplier default
// 6. Zero
// ============================================================

function resolveGSTRate(
  raw,
  productMaster,
  supplier
) {

  // ----------------------------------------------------------
  // DIRECT GST
  // ----------------------------------------------------------

  const gstField =
    getMappedValue(
      raw,
      "gstRate",
      supplier
    );


  const directGST =
    toNumber(
      gstField.value
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

      }
    );

  }


  // ----------------------------------------------------------
  // CGST + SGST
  // ----------------------------------------------------------

  const cgstField =
    getMappedValue(
      raw,
      "cgstRate"
    );


  const sgstField =
    getMappedValue(
      raw,
      "sgstRate"
    );


  const cgst =
    toNumber(
      cgstField.value
    );


  const sgst =
    toNumber(
      sgstField.value
    );


  if (
    cgst !== null ||
    sgst !== null
  ) {

    const total =
      (cgst || 0) +
      (sgst || 0);


    return makeResolved(
      total,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.CALCULATED,
      0.95,
      {

        reason:
          "GST rate calculated as CGST + SGST",

      }
    );

  }


  // ----------------------------------------------------------
  // IGST
  // ----------------------------------------------------------

  const igstField =
    getMappedValue(
      raw,
      "igstRate"
    );


  const igst =
    toNumber(
      igstField.value
    );


  if (
    igst !== null &&
    igst >= 0
  ) {

    return makeResolved(
      igst,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.RESOLVED,
      0.95,
      {

        sourceField:
          igstField.sourceField,

      }
    );

  }


  // ----------------------------------------------------------
  // PRODUCT MASTER
  // ----------------------------------------------------------

  const masterGST =
    toNumber(
      productMaster?.gstRate
    );


  if (
    masterGST !== null
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
  // SUPPLIER DEFAULT
  // ----------------------------------------------------------

  const supplierGST =
    toNumber(
      supplier
        ?.taxRules
        ?.defaultGstRate
    );


  if (
    supplierGST !== null
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
  // NO GST INFORMATION
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
  raw
) {

  const field =
    getMappedValue(
      raw,
      "cgstRate"
    );


  const value =
    toNumber(
      field.value
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

      }
    );

  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// SGST RATE
// ============================================================

function resolveSGSTRate(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "sgstRate"
    );


  const value =
    toNumber(
      field.value
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

      }
    );

  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// IGST RATE
// ============================================================

function resolveIGSTRate(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "igstRate"
    );


  const value =
    toNumber(
      field.value
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

      }
    );

  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// DISCOUNT RATE
// ============================================================

function resolveDiscountRate(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "discountRate"
    );


  const value =
    toNumber(
      field.value
    );


  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.94,
      {

        sourceField:
          field.sourceField,

      }
    );

  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0.90,
    {

      reason:
        "No invoice discount found; defaulted to zero",

    }
  );

}


// ============================================================
// DISCOUNT AMOUNT
// ============================================================

function resolveDiscountAmount(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "discountAmount"
    );


  const value =
    toNumber(
      field.value
    );


  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.94,
      {

        sourceField:
          field.sourceField,

      }
    );

  }


  return makeResolved(
    0,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0.90
  );

}


// ============================================================
// EXTRACTED TAXABLE AMOUNT
// ============================================================
//
// This is ONLY the value extracted from the invoice.
//
// It must NOT automatically become the final canonical
// taxable amount.
//
// amountResolver.js will compare it against calculated values.
// ============================================================

function resolveExtractedTaxableAmount(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "taxableAmount"
    );


  const value =
    toNumber(
      field.value
    );


  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.90,
      {

        sourceField:
          field.sourceField,

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// EXTRACTED TOTAL AMOUNT
// ============================================================
//
// IMPORTANT:
//
// This is the RAW invoice amount.
//
// We intentionally give it lower confidence because:
//
// amount
// total_amount
// net_amount
//
// may mean different things in different invoices.
//
// amountResolver.js decides what it actually represents.
// ============================================================

function resolveExtractedAmount(
  raw
) {

  const field =
    getMappedValue(
      raw,
      "amount"
    );


  const value =
    toNumber(
      field.value
    );


  if (
    value !== null &&
    value >= 0
  ) {

    return makeResolved(
      value,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.80,
      {

        sourceField:
          field.sourceField,

        reason:
          "Raw invoice amount requires validation",

      }
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// BARCODE
// ============================================================

function resolveBarcode(
  raw,
  productMaster
) {

  const field =
    getMappedValue(
      raw,
      "barcode"
    );


  const invoiceBarcode =
    normalizeText(
      field.value
    );


  if (
    invoiceBarcode
  ) {

    return makeResolved(
      invoiceBarcode,
      FIELD_SOURCE.INVOICE,
      FIELD_METHOD.EXTRACTED,
      0.95,
      {

        sourceField:
          field.sourceField,

      }
    );

  }


  const masterBarcode =
    normalizeText(
      productMaster?.barcode
    );


  if (
    masterBarcode
  ) {

    return makeResolved(
      masterBarcode,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.90
    );

  }


  return makeResolved(
    null,
    FIELD_SOURCE.SYSTEM,
    FIELD_METHOD.DEFAULTED,
    0
  );

}


// ============================================================
// PRICING MODE
// ============================================================
//
// We should NOT guess unnecessarily.
//
// Priority:
//
// 1. Supplier profile
// 2. Explicit invoice field
// 3. GST included flag
// 4. Unknown
// ============================================================

function resolvePricingMode(
  raw,
  supplier
) {

  if (
    supplier?.pricingMode &&
    supplier.pricingMode !==
      PRICING_MODE.UNKNOWN
  ) {

    return supplier.pricingMode;

  }


  const explicit =
    normalizeText(
      raw?.pricing_mode ||
      raw?.pricingMode ||
      raw?.rate_type ||
      raw?.rateType
    );


  if (
    explicit
  ) {

    const value =
      explicit.toLowerCase();


    if (
      value.includes(
        "inclusive"
      )
    ) {

      return PRICING_MODE.INCLUSIVE_TAX;

    }


    if (
      value.includes(
        "exclusive"
      )
    ) {

      return PRICING_MODE.EXCLUSIVE_TAX;

    }


    if (
      value.includes(
        "discount"
      )
    ) {

      return PRICING_MODE.AFTER_DISCOUNT;

    }

  }


  const gstIncluded =
    raw?.gst_included ??
    raw?.gstIncluded ??
    supplier
      ?.taxRules
      ?.gstIncluded;


  if (
    gstIncluded === true
  ) {

    return PRICING_MODE.INCLUSIVE_TAX;

  }


  if (
    gstIncluded === false
  ) {

    return PRICING_MODE.EXCLUSIVE_TAX;

  }


  return PRICING_MODE.UNKNOWN;

}


// ============================================================
// RESOLVE BASIC PRODUCT
// ============================================================
//
// This is the main function that the normalizer will call.
//
// It resolves fields but does NOT calculate final amount.
// ============================================================

function resolveBasicProduct(
  raw,
  options = {}
) {

  raw =
    raw &&
    typeof raw === "object"
      ? raw
      : {};


  const productMaster =
    options.productMaster ||
    null;


  const historicalProduct =
    options.historicalProduct ||
    null;


  const supplier =
    options.supplier ||
    null;


  return {

    product: {

      name:
        resolveProductName(
          raw,
          productMaster
        ),

      code:
        resolveProductCode(
          raw,
          productMaster
        ),

      hsn:
        resolveHSN(
          raw,
          productMaster,
          historicalProduct
        ),

      unit:
        resolveUnit(
          raw,
          productMaster,
          supplier
        ),

      mrp:
        resolveMRP(
          raw,
          productMaster
        ),

      barcode:
        resolveBarcode(
          raw,
          productMaster
        ),

    },


    purchase: {

      quantity:
        resolveQuantity(
          raw
        ),

      purchaseRate:
        resolvePurchaseRate(
          raw
        ),

      discountRate:
        resolveDiscountRate(
          raw
        ),

      discountAmount:
        resolveDiscountAmount(
          raw
        ),

      extractedTaxableAmount:
        resolveExtractedTaxableAmount(
          raw
        ),

    },


    tax: {

      gstRate:
        resolveGSTRate(
          raw,
          productMaster,
          supplier
        ),

      cgstRate:
        resolveCGSTRate(
          raw
        ),

      sgstRate:
        resolveSGSTRate(
          raw
        ),

      igstRate:
        resolveIGSTRate(
          raw
        ),

    },


    extractedAmount:
      resolveExtractedAmount(
        raw
      ),


    pricingMode:
      resolvePricingMode(
        raw,
        supplier
      ),

  };

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  isEmpty,

  toNumber,

  normalizeText,

  normalizeUnit,

  normalizeProductName,

  getConfidenceLevel,

  getMappedValue,

  findProductMaster,

  resolveProductName,

  resolveProductCode,

  resolveHSN,

  resolveQuantity,

  resolveUnit,

  resolvePurchaseRate,

  resolveMRP,

  resolveGSTRate,

  resolveCGSTRate,

  resolveSGSTRate,

  resolveIGSTRate,

  resolveDiscountRate,

  resolveDiscountAmount,

  resolveExtractedTaxableAmount,

  resolveExtractedAmount,

  resolveBarcode,

  resolvePricingMode,

  resolveBasicProduct,

};