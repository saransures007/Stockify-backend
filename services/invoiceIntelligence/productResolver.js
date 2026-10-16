// ============================================================
// PRODUCT RESOLVER
// ============================================================
//
// Responsibility:
//
// Resolve the canonical PRODUCT information for an invoice line.
//
// This layer sits above fieldResolver.js.
//
// fieldResolver.js
//      ↓
// individual field extraction
//
// productResolver.js
//      ↓
// product identity / master matching
//      ↓
// canonical product
//
// Responsibilities:
//
//   - Find matching product master
//   - Resolve canonical product name
//   - Resolve product code
//   - Resolve HSN
//   - Resolve unit
//   - Resolve MRP
//   - Resolve barcode
//   - Preserve source/confidence information
//
// This file does NOT:
//   - calculate invoice amounts
//   - calculate tax
//   - validate invoice
//   - modify database
//
// ============================================================

const {
  FIELD_SOURCE,
  FIELD_METHOD,
  resolvedField,
} = require("./canonicalTypes");

const {
  normalizeText,
  normalizeProductName,
  normalizeUnit,
  getMappedValue,
  toNumber,
  findProductMaster,

  resolveProductName,
  resolveProductCode,
  resolveHSN,
  resolveUnit,
  resolveMRP,
  resolveBarcode,
} = require("./fieldResolver");


// ============================================================
// SAFE ARRAY
// ============================================================

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


// ============================================================
// SAFE OBJECT
// ============================================================

function safeObject(value) {

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {};
}


// ============================================================
// NORMALIZE ID
// ============================================================

function normalizeId(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    Number.isFinite(number)
  ) {
    return number;
  }

  return String(value).trim();

}


// ============================================================
// CREATE RESOLVED FIELD
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
// PRODUCT NAME NORMALIZATION
// ============================================================

function normalizedName(value) {

  const text =
    normalizeText(value);

  if (!text) {
    return "";
  }

  return normalizeProductName(
    text
  );

}


// ============================================================
// PRODUCT MASTER ID
// ============================================================

function resolveProductMasterId(
  productMaster
) {

  if (
    !productMaster
  ) {

    return makeResolved(
      null,
      FIELD_SOURCE.SYSTEM,
      FIELD_METHOD.DEFAULTED,
      0,
      {
        reason:
          "Product master not found",
      }
    );

  }


  const id =
    normalizeId(
      productMaster.id ??
      productMaster.productId ??
      productMaster.itemId ??
      productMaster.product_id ??
      productMaster.item_id
    );


  if (
    id !== null
  ) {

    return makeResolved(
      id,
      FIELD_SOURCE.PRODUCT_MASTER,
      FIELD_METHOD.RESOLVED,
      0.98,
      {
        reason:
          "Product master identified",
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
        "Product master has no identifier",
    }
  );

}


// ============================================================
// PRODUCT MASTER MATCH
// ============================================================
//
// Matching priority:
//
// 1. Existing product ID
// 2. Item code
// 3. Barcode
// 4. Exact product name
// 5. Alias
// 6. HSN + name
//
// We intentionally do NOT perform fuzzy matching here.
//
// Fuzzy matching can create dangerous product mappings.
// It should be handled separately and explicitly reviewed.
//
// ============================================================

function matchProduct(
  raw,
  productMasters = []
) {

  const products =
    safeArray(
      productMasters
    );


  if (
    products.length === 0
  ) {
    return {
      product: null,
      method: "none",
      confidence: 0,
    };
  }


  const source =
    safeObject(raw);


  // ----------------------------------------------------------
  // EXISTING PRODUCT ID
  // ----------------------------------------------------------

  const rawProductId =
    normalizeId(
      source.productId ??
      source.product_id ??
      source.itemId ??
      source.item_id
    );


  if (
    rawProductId !== null
  ) {

    const idMatch =
      products.find(
        product =>
          normalizeId(
            product?.id ??
            product?.productId ??
            product?.itemId ??
            product?.product_id ??
            product?.item_id
          ) ===
          rawProductId
      );


    if (
      idMatch
    ) {

      return {
        product:
          idMatch,

        method:
          "product_id",

        confidence:
          0.99,
      };

    }

  }


  // ----------------------------------------------------------
  // ITEM CODE
  // ----------------------------------------------------------

  const extractedCode =
    normalizeText(
      getMappedValue(
        source,
        "code"
      )?.value
    );


  if (
    extractedCode
  ) {

    const codeMatch =
      products.find(
        product =>
          normalizeText(
            product?.itemCode ??
            product?.code ??
            product?.item_code
          ).toLowerCase() ===
          extractedCode.toLowerCase()
      );


    if (
      codeMatch
    ) {

      return {
        product:
          codeMatch,

        method:
          "item_code",

        confidence:
          0.98,
      };

    }

  }


  // ----------------------------------------------------------
  // BARCODE
  // ----------------------------------------------------------

  const extractedBarcode =
    normalizeText(
      getMappedValue(
        source,
        "barcode"
      )?.value
    );


  if (
    extractedBarcode
  ) {

    const barcodeMatch =
      products.find(
        product =>
          normalizeText(
            product?.barcode ??
            product?.barCode ??
            product?.ean ??
            product?.upc
          ) ===
          extractedBarcode
      );


    if (
      barcodeMatch
    ) {

      return {
        product:
          barcodeMatch,

        method:
          "barcode",

        confidence:
          0.99,
      };

    }

  }


  // ----------------------------------------------------------
  // PRODUCT NAME
  // ----------------------------------------------------------

  const extractedName =
    normalizedName(
      getMappedValue(
        source,
        "name"
      )?.value
    );


  if (
    extractedName
  ) {

    const exactNameMatch =
      products.find(
        product => {

          const masterName =
            normalizedName(
              product?.canonicalName ??
              product?.name ??
              product?.itemName ??
              product?.description
            );

          return (
            masterName &&
            masterName ===
              extractedName
          );

        }
      );


    if (
      exactNameMatch
    ) {

      return {
        product:
          exactNameMatch,

        method:
          "exact_name",

        confidence:
          0.96,
      };

    }


    // --------------------------------------------------------
    // ALIAS
    // --------------------------------------------------------

    const aliasMatch =
      products.find(
        product => {

          const aliases =
            safeArray(
              product?.aliases
            );


          return aliases.some(
            alias =>
              normalizedName(
                alias
              ) ===
              extractedName
          );

        }
      );


    if (
      aliasMatch
    ) {

      return {
        product:
          aliasMatch,

        method:
          "alias",

        confidence:
          0.93,
      };

    }

  }


  // ----------------------------------------------------------
  // HSN + NAME
  // ----------------------------------------------------------

  const extractedHSN =
    normalizeText(
      getMappedValue(
        source,
        "hsn"
      )?.value
    );


  if (
    extractedName &&
    extractedHSN
  ) {

    const hsnNameMatch =
      products.find(
        product => {

          const masterName =
            normalizedName(
              product?.canonicalName ??
              product?.name ??
              product?.itemName ??
              product?.description
            );


          const masterHSN =
            normalizeText(
              product?.hsn ??
              product?.hsnCode ??
              product?.hsn_code
            );


          return (
            masterName ===
              extractedName &&
            masterHSN ===
              extractedHSN
          );

        }
      );


    if (
      hsnNameMatch
    ) {

      return {
        product:
          hsnNameMatch,

        method:
          "hsn_name",

        confidence:
          0.94,
      };

    }

  }


  // ----------------------------------------------------------
  // NO MATCH
  // ----------------------------------------------------------

  return {
    product:
      null,

    method:
      "none",

    confidence:
      0,
  };

}


// ============================================================
// RESOLVE PRODUCT
// ============================================================

function resolveProduct(
  raw,
  options = {}
) {

  const source =
    safeObject(raw);


  const productMasters =
    safeArray(
      options.productMasters
    );


  const historicalProducts =
    safeArray(
      options.historicalProducts
    );


  const productMaster =
    options.productMaster ||
    null;


  const historicalProduct =
    options.historicalProduct ||
    null;


  // ----------------------------------------------------------
  // FIND PRODUCT MASTER
  // ----------------------------------------------------------

  const matched =
    productMaster
      ? {
          product:
            productMaster,

          method:
            "provided",

          confidence:
            0.98,
        }
      : matchProduct(
          source,
          productMasters
        );


  const master =
    matched.product;


  // ----------------------------------------------------------
  // HISTORICAL MATCH
  // ----------------------------------------------------------

  const historical =
    historicalProduct ||
    (
      historicalProducts.length > 0
        ? matchProduct(
            source,
            historicalProducts
          ).product
        : null
    );


  // ----------------------------------------------------------
  // RESOLVE BASIC FIELDS
  // ----------------------------------------------------------

  const nameField =
    resolveProductName(
      source,
      master
    );


  const codeField =
    resolveProductCode(
      source,
      master
    );


  const hsnField =
    resolveHSN(
      source,
      master,
      historical
    );


  const unitField =
    resolveUnit(
      source,
      master,
      options.supplier ||
        null
    );


  const mrpField =
    resolveMRP(
      source,
      master
    );


  const barcodeField =
    resolveBarcode(
      source,
      master
    );


  // ----------------------------------------------------------
  // MASTER ID
  // ----------------------------------------------------------

  const masterIdField =
    resolveProductMasterId(
      master
    );


  // ----------------------------------------------------------
  // MATCH WARNING
  // ----------------------------------------------------------

  const warnings = [];


  if (
    !master &&
    normalizedName(
      source.name ??
      source.description ??
      source.product
    )
  ) {

    warnings.push(
      "Invoice product could not be matched to a product master"
    );

  }


  // ----------------------------------------------------------
  // RESULT
  // ----------------------------------------------------------

  const confidenceValues = [

    Number(
      nameField?.confidence ??
      0
    ),

    Number(
      codeField?.confidence ??
      0
    ),

    Number(
      hsnField?.confidence ??
      0
    ),

    Number(
      unitField?.confidence ??
      0
    ),

    Number(
      mrpField?.confidence ??
      0
    ),

  ];


  const validConfidence =
    confidenceValues.filter(
      value =>
        Number.isFinite(
          value
        )
    );


  const averageConfidence =
    validConfidence.length > 0
      ? Number(
          (
            validConfidence.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            validConfidence.length
          ).toFixed(3)
        )
      : 0;


  const finalConfidence =
    master
      ? Math.max(
          averageConfidence,
          matched.confidence
        )
      : averageConfidence;


  return {

    product: {

      id:
        masterIdField,

      name:
        nameField,

      code:
        codeField,

      hsn:
        hsnField,

      unit:
        unitField,

      mrp:
        mrpField,

      barcode:
        barcodeField,

    },


    match: {

      matched:
        Boolean(master),

      method:
        matched.method,

      confidence:
        matched.confidence,

      productMaster:
        master,

      historicalProduct:
        historical,

    },


    confidence:
      finalConfidence,


    warnings,

  };

}


// ============================================================
// RESOLVE PRODUCT FOR CANONICAL LINE
// ============================================================

function resolveCanonicalProduct(
  raw,
  options = {}
) {

  const result =
    resolveProduct(
      raw,
      options
    );


  return {

    product:
      result.product,

    match:
      result.match,

    confidence:
      result.confidence,

    warnings:
      result.warnings,

  };

}


// ============================================================
// FIND PRODUCT
// ============================================================

function findProduct(
  raw,
  productMasters = []
) {

  return matchProduct(
    raw,
    productMasters
  );

}


// ============================================================
// IS PRODUCT MATCHED
// ============================================================

function isProductMatched(
  result
) {

  return Boolean(
    result?.match?.matched
  );

}


// ============================================================
// PRODUCT MATCH CONFIDENCE
// ============================================================

function getProductConfidence(
  result
) {

  const value =
    Number(
      result?.confidence
    );


  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }


  return value;

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  makeResolved,

  normalizeId,

  normalizedName,

  matchProduct,

  findProduct,

  resolveProductMasterId,

  resolveProduct,

  resolveCanonicalProduct,

  isProductMatched,

  getProductConfidence,

};