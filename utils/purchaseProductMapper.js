// const petpooja = require("../services/petpoojaService");

// // ============================================================
// // NORMALIZE
// // ============================================================

// function normalizeName(value) {
//   return String(value || "")
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// // ============================================================
// // TOKENS
// // ============================================================

// function tokenize(value) {
//   return normalizeName(value)
//     .split(" ")
//     .filter(Boolean);
// }

// // ============================================================
// // LEVENSHTEIN
// // ============================================================

// function levenshtein(a, b) {
//   a = normalizeName(a);
//   b = normalizeName(b);

//   const matrix = [];

//   for (let i = 0; i <= b.length; i++) {
//     matrix[i] = [i];
//   }

//   for (let j = 0; j <= a.length; j++) {
//     matrix[0][j] = j;
//   }

//   for (let i = 1; i <= b.length; i++) {
//     for (let j = 1; j <= a.length; j++) {
//       if (b.charAt(i - 1) === a.charAt(j - 1)) {
//         matrix[i][j] = matrix[i - 1][j - 1];
//       } else {
//         matrix[i][j] = Math.min(
//           matrix[i - 1][j] + 1,
//           matrix[i][j - 1] + 1,
//           matrix[i - 1][j - 1] + 1
//         );
//       }
//     }
//   }

//   return matrix[b.length][a.length];
// }

// // ============================================================
// // STRING SIMILARITY
// // ============================================================

// function stringSimilarity(a, b) {
//   const first = normalizeName(a);
//   const second = normalizeName(b);

//   if (!first || !second) {
//     return 0;
//   }

//   if (first === second) {
//     return 100;
//   }

//   const distance = levenshtein(first, second);

//   const maxLength = Math.max(
//     first.length,
//     second.length
//   );

//   if (!maxLength) {
//     return 0;
//   }

//   return Math.round(
//     (1 - distance / maxLength) * 100
//   );
// }

// // ============================================================
// // TOKEN SIMILARITY
// // ============================================================

// function tokenSimilarity(invoiceName, itemName) {
//   const invoiceTokens = tokenize(invoiceName);
//   const itemTokens = tokenize(itemName);

//   if (
//     !invoiceTokens.length ||
//     !itemTokens.length
//   ) {
//     return 0;
//   }

//   let matched = 0;

//   for (const invoiceToken of invoiceTokens) {
//     let best = 0;

//     for (const itemToken of itemTokens) {
//       const similarity = stringSimilarity(
//         invoiceToken,
//         itemToken
//       );

//       if (similarity > best) {
//         best = similarity;
//       }
//     }

//     if (best >= 75) {
//       matched++;
//     }
//   }

//   return Math.round(
//     (matched / invoiceTokens.length) * 100
//   );
// }

// // ============================================================
// // PRODUCT SCORE
// // ============================================================

// function calculateScore(invoiceProduct, item) {
//   const invoiceName =
//     invoiceProduct?.description || "";

//   const itemName =
//     item?.itemName || "";

//   const invoiceHsn =
//     String(invoiceProduct?.hsn || "");

//   const itemHsn =
//     String(item?.hsn || "");

//   const invoiceMrp =
//     Number(invoiceProduct?.mrp || 0);

//   const itemMrp =
//     Number(item?.mrp || 0);

//   const reasons = [];

//   let score = 0;

//   // ==========================================================
//   // NAME
//   // ==========================================================

//   const normalizedInvoiceName =
//     normalizeName(invoiceName);

//   const normalizedItemName =
//     normalizeName(itemName);

//   if (
//     normalizedInvoiceName &&
//     normalizedItemName &&
//     normalizedInvoiceName === normalizedItemName
//   ) {
//     score += 60;

//     reasons.push(
//       "name_exact_match"
//     );
//   } else {
//     const fullSimilarity =
//       stringSimilarity(
//         invoiceName,
//         itemName
//       );

//     const tokenScore =
//       tokenSimilarity(
//         invoiceName,
//         itemName
//       );

//     const nameScore =
//       Math.max(
//         fullSimilarity,
//         tokenScore
//       );

//     if (nameScore >= 90) {
//       score += 55;

//       reasons.push(
//         "name_very_high_similarity"
//       );
//     } else if (nameScore >= 80) {
//       score += 45;

//       reasons.push(
//         "name_high_similarity"
//       );
//     } else if (nameScore >= 70) {
//       score += 30;

//       reasons.push(
//         "name_medium_similarity"
//       );
//     } else if (nameScore >= 60) {
//       score += 15;

//       reasons.push(
//         "name_low_similarity"
//       );
//     }
//   }

//   // ==========================================================
//   // HSN
//   // ==========================================================

//   if (
//     invoiceHsn &&
//     itemHsn &&
//     invoiceHsn === itemHsn
//   ) {
//     score += 25;

//     reasons.push(
//       "hsn_match"
//     );
//   }

//   // ==========================================================
//   // MRP
//   // ==========================================================

//   if (
//     invoiceMrp > 0 &&
//     itemMrp > 0 &&
//     invoiceMrp === itemMrp
//   ) {
//     score += 10;

//     reasons.push(
//       "mrp_match"
//     );
//   }

//   return {
//     score: Math.min(score, 100),
//     reasons
//   };
// }

// // ============================================================
// // CONFIDENCE LABEL
// // ============================================================

// function confidenceLabel(score) {
//   if (score >= 100) {
//     return "Exact Match";
//   }

//   if (score >= 90) {
//     return "Very High Confidence";
//   }

//   if (score >= 75) {
//     return "High Confidence";
//   }

//   if (score >= 50) {
//     return "Medium Confidence";
//   }

//   if (score > 0) {
//     return "Low Confidence";
//   }

//   return "No Match";
// }

// // ============================================================
// // FORMAT PETPOOJA ITEM
// // ============================================================

// function formatItem(item) {
//   return {
//     id: item?.id,

//     itemName:
//       item?.itemName,

//     description:
//       item?.description || "",

//     hsn:
//       item?.hsn || "",

//     mrp:
//       Number(item?.mrp || 0),

//     purchaseRate:
//       Number(item?.purchaseRate || 0),

//     salesRate:
//       Number(item?.salesRate || 0)
//   };
// }

// // ============================================================
// // SEARCH PETPOOJA
// // ============================================================

// async function searchPetpooja(invoiceProduct) {
//   const name =
//     invoiceProduct?.description?.trim();

//   if (!name) {
//     return [];
//   }

//   console.log(
//     "[Purchase Mapper] Petpooja search:",
//     name
//   );

//   const response =
//     await petpooja.searchItems({
//       name
//     });

//   const items =
//     response?.data ||
//     response?.items ||
//     [];

//   if (!Array.isArray(items)) {
//     return [];
//   }

//   console.log(
//     `[Purchase Mapper] Search returned ${items.length} items`
//   );

//   return items;
// }

// // ============================================================
// // GET FULL PETPOOJA ITEM
// // ============================================================

// async function getFullPetpoojaItem(item) {
//   if (!item?.id) {
//     return item;
//   }

//   try {
//     console.log(
//       "[Purchase Mapper] Fetching full item:",
//       item.id
//     );

//     const detail =
//       await petpooja.getItemById(
//         item.id
//       );

//     if (detail) {
//       return detail;
//     }
//   } catch (error) {
//     console.log(
//       "[Purchase Mapper] getItemById failed:",
//       error.response?.data ||
//         error.message
//     );
//   }

//   return item;
// }

// // ============================================================
// // MAP PRODUCT
// // ============================================================

// async function mapProduct(invoiceProduct) {

//   if (!invoiceProduct) {
//     throw new Error(
//       "Invoice product is required"
//     );
//   }

//   const invoiceDescription =
//     invoiceProduct?.description?.trim();

//   if (!invoiceDescription) {
//     return {
//       status: "UNMATCHED",
//       confidence: 0,
//       confidenceLabel: "No Match",
//       petpoojaItem: null,
//       candidates: [],
//       reasons: [],
//       reason:
//         "Invoice description is empty"
//     };
//   }

//   // ==========================================================
//   // SEARCH BY NAME
//   // ==========================================================

//   const items =
//     await searchPetpooja(
//       invoiceProduct
//     );

//   if (!items.length) {
//     return {
//       status: "UNMATCHED",
//       confidence: 0,
//       confidenceLabel: "No Match",
//       petpoojaItem: null,
//       candidates: [],
//       reasons: [],
//       reason:
//         "No matching Petpooja product found"
//     };
//   }

//   // ==========================================================
//   // SCORE SEARCH RESULTS
//   // ==========================================================

//   const candidates =
//     items
//       .map(item => {

//         const result =
//           calculateScore(
//             invoiceProduct,
//             item
//           );

//         return {
//           score:
//             result.score,

//           confidence:
//             result.score,

//           confidenceLabel:
//             confidenceLabel(
//               result.score
//             ),

//           reasons:
//             result.reasons,

//           item:
//             formatItem(item)
//         };
//       })
//       .filter(
//         candidate =>
//           candidate.score > 0
//       )
//       .sort(
//         (a, b) =>
//           b.score - a.score
//       );

//   // ==========================================================
//   // NO MATCH
//   // ==========================================================

//   if (!candidates.length) {
//     return {
//       status: "UNMATCHED",
//       confidence: 0,
//       confidenceLabel: "No Match",
//       petpoojaItem: null,
//       candidates: [],
//       reasons: [],
//       reason:
//         "No matching Petpooja product found"
//     };
//   }

//   // ==========================================================
//   // IMPORTANT
//   //
//   // DO NOT TRUST SEARCH RESULT DESCRIPTION.
//   //
//   // Fetch the actual Petpooja item.
//   // ==========================================================

//   const best =
//     candidates[0];

//   const searchItem =
//     items.find(
//       item =>
//         String(item.id) ===
//         String(best.item.id)
//     );

//   const fullItem =
//     await getFullPetpoojaItem(
//       searchItem
//     );

//   // ==========================================================
//   // EXACT DESCRIPTION CHECK
//   //
//   // THIS IS THE ONLY WAY TO MARK
//   // ALREADY_MAPPED.
//   // ==========================================================

//   const invoiceDescriptionNormalized =
//     normalizeName(
//       invoiceDescription
//     );

//   const petpoojaDescriptionNormalized =
//     normalizeName(
//       fullItem?.description
//     );

//   console.log(
//     "[Purchase Mapper] Description check:",
//     {
//       invoiceDescription,
//       petpoojaDescription:
//         fullItem?.description,
//       invoiceNormalized:
//         invoiceDescriptionNormalized,
//       petpoojaNormalized:
//         petpoojaDescriptionNormalized,
//       itemId:
//         fullItem?.id
//     }
//   );

//   // ==========================================================
//   // ALREADY MAPPED
//   // ==========================================================

//   if (
//     invoiceDescriptionNormalized &&
//     petpoojaDescriptionNormalized &&
//     invoiceDescriptionNormalized ===
//       petpoojaDescriptionNormalized
//   ) {

//     const formattedFullItem =
//       formatItem(fullItem);

//     return {
//       status:
//         "ALREADY_MAPPED",

//       confidence:
//         100,

//       confidenceLabel:
//         "Already Mapped",

//       petpoojaItem:
//         formattedFullItem,

//       candidates: [
//         {
//           score: 100,

//           confidence: 100,

//           confidenceLabel:
//             "Already Mapped",

//           reasons: [
//             "description_exact"
//           ],

//           item:
//             formattedFullItem
//         }
//       ],

//       reasons: [
//         "description_exact"
//       ],

//       reason:
//         "Product was previously mapped"
//     };
//   }

//   // ==========================================================
//   // NOT ALREADY MAPPED
//   //
//   // Even 100% NAME MATCH requires user confirmation.
//   // ==========================================================

//   const formattedBestItem =
//     formatItem(fullItem);

//   return {
//     status:
//       "PENDING_CONFIRMATION",

//     confidence:
//       Math.min(
//         best.score,
//         100
//       ),

//     confidenceLabel:
//       confidenceLabel(
//         best.score
//       ),

//     petpoojaItem:
//       formattedBestItem,

//     candidates:
//       candidates
//         .slice(0, 5)
//         .map(candidate => {

//           // Replace best candidate with
//           // full Petpooja item data.
//           if (
//             String(candidate.item.id) ===
//             String(best.item.id)
//           ) {
//             return {
//               ...candidate,
//               item:
//                 formattedBestItem
//             };
//           }

//           return candidate;
//         }),

//     reasons:
//       best.reasons,

//     reason:
//       "User confirmation required"
//   };
// }

// // ============================================================
// // EXPORT
// // ============================================================

// module.exports = {
//   mapProduct,
//   normalizeName,
//   calculateScore,
//   confidenceLabel
// };

// utils/purchaseProductMapper.js
const PURCHASE_MAPPING_KEY = "purchaseMapping";

// ==========================================================
// NORMALIZE NAME
// ==========================================================

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ==========================================================
// NUMBER
// ==========================================================

function toNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

// ==========================================================
// SEARCH QUERIES
// ==========================================================

function buildSearchQueries(description) {
  const original = String(description || "").trim();

  if (!original) {
    return [];
  }

  const normalized = normalizeName(original);

  const queries = [];

  const add = (value) => {
    const query = String(value || "").trim();

    if (!query) {
      return;
    }

    if (!queries.includes(query)) {
      queries.push(query);
    }
  };

  add(original);
  add(normalized);

  const tokens = normalized
    .split(" ")
    .filter(Boolean);

  if (tokens.length > 1) {
    add(tokens.slice(0, 2).join(" "));
  }

  if (tokens.length > 2) {
    add(tokens.slice(0, 3).join(" "));
  }

  for (const token of tokens) {
    if (token.length >= 3) {
      add(token);
    }
  }

  return queries;
}

// ==========================================================
// PARSE PURCHASE MAPPING METAFIELD
// ==========================================================

function parsePurchaseMappingMetafield(metafields) {
  if (!Array.isArray(metafields)) {
    return {
      index: -1,
      invoiceNames: [],
      metafield: null,
      metafieldId: null,
    };
  }

  const index = metafields.findIndex(
    (field) =>
      field &&
      field.key === PURCHASE_MAPPING_KEY
  );

  if (index < 0) {
    return {
      index: -1,
      invoiceNames: [],
      metafield: null,
      metafieldId: null,
    };
  }

  const metafield =
    metafields[index];

  let parsed = {};

  try {
    if (
      typeof metafield.value ===
      "string"
    ) {
      parsed =
        JSON.parse(
          metafield.value
        );
    } else if (
      metafield.value &&
      typeof metafield.value ===
        "object"
    ) {
      parsed =
        metafield.value;
    }
  } catch (error) {
    console.warn(
      "[Purchase Mapper] Invalid purchaseMapping metafield:",
      error.message
    );

    parsed = {};
  }

  return {
    index,

    invoiceNames:
      Array.isArray(
        parsed?.invoiceNames
      )
        ? parsed.invoiceNames
        : [],

    metafield,

    metafieldId:
      metafield?.metafieldId ??
      metafield?.id ??
      null,
  };
}

// ==========================================================
// BUILD NEW PURCHASE MAPPING METAFIELD
// ==========================================================
//
// IMPORTANT:
// This function is ONLY for creating a NEW metafield.
//
// NEVER use this object to replace an existing metafield,
// because an existing Petpooja metafield may require
// metafieldId.
//

function buildPurchaseMappingMetafield(
  invoiceNames
) {
  const names =
    Array.isArray(invoiceNames)
      ? invoiceNames
      : [];

  return {
    key:
      PURCHASE_MAPPING_KEY,

    value:
      JSON.stringify({
        invoiceNames: names,
      }),
  };
}

// ==========================================================
// UPDATE EXISTING PURCHASE MAPPING METAFIELD
// ==========================================================
//
// Preserve every existing property.
//
// This is important because Petpooja requires
// metafieldId when updating an existing metafield.
//

function updatePurchaseMappingMetafield(
  existingMetafield,
  invoiceNames
) {
  if (!existingMetafield) {
    return buildPurchaseMappingMetafield(
      invoiceNames
    );
  }

  return {
    ...existingMetafield,

    key:
      PURCHASE_MAPPING_KEY,

    value:
      JSON.stringify({
        invoiceNames:
          Array.isArray(invoiceNames)
            ? invoiceNames
            : [],
      }),
  };
}

function toNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[()[\]{}\-_/.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// ============================================================
// TOKENS
// ============================================================

function getTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}


// ============================================================
// REMOVE WEAK TOKENS
// ============================================================

const STOP_WORDS = new Set([
  "THE",
  "AND",
  "OF",
  "FOR",
  "WITH",
  "PACK",
  "PCS",
  "PC",
  "UNIT",
  "UNITS",
  "GM",
  "G",
  "KG",
  "ML",
  "L",
  "MRP"
]);

function getMeaningfulTokens(value) {
  return getTokens(value).filter(
    token =>
      token.length >= 2 &&
      !STOP_WORDS.has(token)
  );
}


// ============================================================
// TOKEN MATCH SCORE
// ============================================================

function tokenMatchScore(invoiceName, candidateName) {

  const invoiceTokens =
    getMeaningfulTokens(invoiceName);

  const candidateTokens =
    getMeaningfulTokens(candidateName);

  if (!invoiceTokens.length) {
    return 0;
  }

  let matched = 0;

  for (const invoiceToken of invoiceTokens) {

    const found =
      candidateTokens.some(
        candidateToken =>
          candidateToken === invoiceToken ||
          candidateToken.includes(invoiceToken) ||
          invoiceToken.includes(candidateToken)
      );

    if (found) {
      matched++;
    }
  }

  return Math.round(
    (matched / invoiceTokens.length) * 100
  );
}


// ============================================================
// CHARACTER SIMILARITY
// ============================================================

function levenshtein(a, b) {

  const s = normalizeText(a);
  const t = normalizeText(b);

  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const matrix = Array.from(
    { length: s.length + 1 },
    () => Array(t.length + 1).fill(0)
  );

  for (let i = 0; i <= s.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= t.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s.length; i++) {

    for (let j = 1; j <= t.length; j++) {

      const cost =
        s[i - 1] === t[j - 1]
          ? 0
          : 1;

      matrix[i][j] =
        Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
    }
  }

  return matrix[s.length][t.length];
}


function characterSimilarity(a, b) {

  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) {
    return 0;
  }

  const distance =
    levenshtein(first, second);

  const maxLength =
    Math.max(
      first.length,
      second.length
    );

  return Math.round(
    (1 - distance / maxLength) * 100
  );
}


// ============================================================
// NAME SCORE
// ============================================================

function calculateNameScore(
  invoiceName,
  itemName,
  itemDescription
) {

  const invoice =
    normalizeText(invoiceName);

  const name =
    normalizeText(itemName);

  const description =
    normalizeText(itemDescription);

  if (!invoice) {
    return {
      score: 0,
      reasons: []
    };
  }

  const reasons = [];

  // ----------------------------------------------------------
  // EXACT DESCRIPTION
  // ----------------------------------------------------------

  if (
    description &&
    invoice === description
  ) {

    reasons.push(
      "description_exact"
    );

    return {
      score: 100,
      reasons
    };
  }


  // ----------------------------------------------------------
  // DESCRIPTION CONTAINS INVOICE
  // ----------------------------------------------------------

  if (
    description &&
    (
      description.includes(invoice) ||
      invoice.includes(description)
    )
  ) {

    reasons.push(
      "description_contains_invoice_name"
    );
  }


  // ----------------------------------------------------------
  // ITEM NAME CONTAINS INVOICE
  // ----------------------------------------------------------

  if (
    name &&
    name.includes(invoice)
  ) {

    reasons.push(
      "invoice_name_inside_itemName"
    );
  }


  // ----------------------------------------------------------
  // INVOICE CONTAINS ITEM NAME
  // ----------------------------------------------------------

  if (
    name &&
    invoice.includes(name)
  ) {

    reasons.push(
      "itemName_inside_invoice_name"
    );
  }


  // ----------------------------------------------------------
  // TOKEN SCORE
  // ----------------------------------------------------------

  const tokenScore =
    tokenMatchScore(
      invoice,
      name
    );


  // ----------------------------------------------------------
  // CHARACTER SCORE
  // ----------------------------------------------------------

  const charScore =
    characterSimilarity(
      invoice,
      name
    );


  // ----------------------------------------------------------
  // FINAL NAME SCORE
  // ----------------------------------------------------------

  let score =
    Math.round(
      tokenScore * 0.65 +
      charScore * 0.35
    );


  if (
    tokenScore >= 90
  ) {

    reasons.push(
      "name_very_high_similarity"
    );

  } else if (
    tokenScore >= 70
  ) {

    reasons.push(
      "name_high_similarity"
    );

  } else if (
    tokenScore >= 50
  ) {

    reasons.push(
      "name_medium_similarity"
    );
  }


  return {
    score,
    reasons,
    tokenScore,
    charScore
  };
}


// ============================================================
// CONFIDENCE LABEL
// ============================================================

function confidenceLabel(score) {

  if (score >= 95) {
    return "Very High Confidence";
  }

  if (score >= 80) {
    return "High Confidence";
  }

  if (score >= 60) {
    return "Medium Confidence";
  }

  if (score > 0) {
    return "Low Confidence";
  }

  return "No Match";
}


// ============================================================
// PRODUCT SCORE
// ============================================================

function scoreProduct(
  invoiceProduct,
  item
) {

  const invoiceName =
    invoiceProduct.description ||
    invoiceProduct.name ||
    "";

  const itemName =
    item.itemName ||
    "";

  const itemDescription =
    item.description ||
    "";

  const nameResult =
    calculateNameScore(
      invoiceName,
      itemName,
      itemDescription
    );

  const reasons = [
    ...nameResult.reasons
  ];

  let score =
    Math.round(
      nameResult.score * 0.80
    );


  // ==========================================================
  // HSN
  // ==========================================================

  if (
    invoiceProduct.hsn &&
    item.hsn &&
    String(invoiceProduct.hsn) ===
      String(item.hsn)
  ) {

    score += 10;

    reasons.push(
      "hsn_match"
    );
  }


  // ==========================================================
  // MRP
  // ==========================================================

  if (
    invoiceProduct.mrp != null &&
    item.mrp != null &&
    Number(invoiceProduct.mrp) ===
      Number(item.mrp)
  ) {

    score += 5;

    reasons.push(
      "mrp_match"
    );
  }


  // ==========================================================
  // PURCHASE RATE
  // ==========================================================

  if (
    invoiceProduct.rate != null &&
    item.purchaseRate != null
  ) {

    const invoiceRate =
      Number(invoiceProduct.rate);

    const purchaseRate =
      Number(item.purchaseRate);

    if (
      invoiceRate > 0 &&
      purchaseRate > 0
    ) {

      const difference =
        Math.abs(
          invoiceRate -
          purchaseRate
        ) / invoiceRate;

      if (
        difference <= 0.05
      ) {

        score += 5;

        reasons.push(
          "purchase_rate_close"
        );
      }
    }
  }


  score =
    Math.min(
      100,
      Math.round(score)
    );


  return {
    score,

    confidence:
      score,

    confidenceLabel:
      confidenceLabel(score),

    reasons
  };
}


// ============================================================
// SEARCH QUERY GENERATOR
// ============================================================

function buildSearchQueries(
  description
) {

  const tokens =
    getMeaningfulTokens(
      description
    );

  const queries = [];

  // Full name
  if (description) {
    queries.push(
      description
    );
  }

  // Remove numbers / sizes
  const alphaTokens =
    tokens.filter(
      token =>
        !/^\d+$/.test(token)
    );


  if (alphaTokens.length >= 2) {

    // Full meaningful words
    queries.push(
      alphaTokens.join(" ")
    );

    // First 2 words
    queries.push(
      alphaTokens
        .slice(0, 2)
        .join(" ")
    );

    // First 3 words
    if (alphaTokens.length >= 3) {

      queries.push(
        alphaTokens
          .slice(0, 3)
          .join(" ")
      );
    }
  }


  // Individual meaningful words
  for (
    const token of alphaTokens
  ) {

    if (
      token.length >= 3
    ) {

      queries.push(token);
    }
  }


  return [
    ...new Set(
      queries
        .map(q => q.trim())
        .filter(Boolean)
    )
  ];
}


// ============================================================
// MAP PRODUCT
// ============================================================

// function mapProduct(
//   invoiceProduct,
//   petpoojaItems
// ) {

//   if (
//     !Array.isArray(
//       petpoojaItems
//     )
//   ) {

//     petpoojaItems = [];
//   }

//   console.log("petpoojaItems->", petpoojaItems)

//   // ==========================================================
//   // 1. CHECK EXACT DESCRIPTION FIRST
//   // ==========================================================

//   const invoiceDescription =
//     normalizeText(
//       invoiceProduct.description
//     );


//   const exactMappedItem =
//     petpoojaItems.find(
//       item =>
//         normalizeText(
//           item.description
//         ) ===
//         invoiceDescription &&
//         invoiceDescription !== ""
//     );


//   if (exactMappedItem) {

//     const score =
//       scoreProduct(
//         invoiceProduct,
//         exactMappedItem
//       );

//     return {

//       status:
//         "ALREADY_MAPPED",

//       confidence:
//         100,

//       confidenceLabel:
//         "Already Mapped",

//       petpoojaItem:
//         exactMappedItem,

//       candidates: [
//         {
//           ...score,
//           item:
//             exactMappedItem
//         }
//       ],

//       reasons: [
//         "description_exact",
//         ...score.reasons.filter(
//           r =>
//             r !==
//             "description_exact"
//         )
//       ],

//       reason:
//         "Product was previously mapped"
//     };
//   }


//   // ==========================================================
//   // 2. SCORE ALL SEARCH RESULTS
//   // ==========================================================

//   const scored =
//     petpoojaItems
//       .map(item => {

//         const result =
//           scoreProduct(
//             invoiceProduct,
//             item
//           );

//         return {
//           ...result,
//           item
//         };
//       })
//       .filter(
//         candidate =>
//           candidate.score > 0
//       )
//       .sort(
//         (a, b) =>
//           b.score - a.score
//       );


//   // ==========================================================
//   // NO CANDIDATES
//   // ==========================================================

//   if (!scored.length) {

//     return {

//       status:
//         "UNMATCHED",

//       confidence:
//         0,

//       confidenceLabel:
//         "No Match",

//       petpoojaItem:
//         null,

//       candidates: [],

//       reasons: [],

//       reason:
//         "No matching Petpooja product found"
//     };
//   }


//   // ==========================================================
//   // TOP CANDIDATE
//   // ==========================================================

//   const best =
//     scored[0];


//   // ==========================================================
//   // IMPORTANT:
//   // NAME MUST BE REASONABLY STRONG
//   //
//   // HSN + MRP alone must NEVER produce
//   // a useful match.
//   // ==========================================================

//   const nameScore =
//     calculateNameScore(
//       invoiceProduct.description,
//       best.item.itemName,
//       best.item.description
//     );


//   if (
//     nameScore.score < 40
//   ) {

//     return {

//       status:
//         "UNMATCHED",

//       confidence:
//         0,

//       confidenceLabel:
//         "No Match",

//       petpoojaItem:
//         null,

//       candidates:
//         scored
//           .slice(0, 10),

//       reasons: [],

//       reason:
//         "No sufficiently similar product name found"
//     };
//   }


//   // ==========================================================
//   // USER CONFIRMATION ALWAYS REQUIRED
//   // ==========================================================

//   return {

//     status:
//       "PENDING_CONFIRMATION",

//     confidence:
//       best.confidence,

//     confidenceLabel:
//       best.confidenceLabel,

//     petpoojaItem:
//       best.item,

//     candidates:
//       scored.slice(0, 10),

//     reasons:
//       best.reasons,

//     reason:
//       "User confirmation required"
//   };
// }


// ============================================================
// EXPORT
// ============================================================

module.exports = {
//   mapProduct,
PURCHASE_MAPPING_KEY,

  


  buildSearchQueries,



  updatePurchaseMappingMetafield,
parsePurchaseMappingMetafield,
normalizeName,
buildPurchaseMappingMetafield,
toNumber,
  scoreProduct,
  buildSearchQueries,
  normalizeText,
  tokenMatchScore,
  characterSimilarity
};