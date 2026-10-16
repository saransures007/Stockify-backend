const petpooja =
  require("./petpoojaService");

const PurchaseProductMapping =
  require("../models/PurchaseProductMapping");

const {
  buildSearchQueries,
  parsePurchaseMappingMetafield,
  normalizeName,
  buildPurchaseMappingMetafield,
  scoreProduct,
  updatePurchaseMappingMetafield,
  toNumber,
} =
  require("../utils/purchaseProductMapper");

class PurchaseMapperService {

  // ==========================================================
  // NORMALIZE NAME
  // ==========================================================

  normalizeName(value) {
    return normalizeName(value);
  }

  // ==========================================================
  // NUMBER
  // ==========================================================

  toNumber(value) {
    return toNumber(value);
  }

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  getConfidenceLabel(score) {

    if (score >= 100) {
      return "Exact Match";
    }

    if (score >= 90) {
      return "Very High Confidence";
    }

    if (score >= 80) {
      return "High Confidence";
    }

    if (score >= 50) {
      return "Medium Confidence";
    }

    if (score > 0) {
      return "Low Confidence";
    }

    return "No Match";
  }

  // ==========================================================
  // LEVENSHTEIN
  // ==========================================================

  levenshteinSimilarity(a, b) {

    if (!a || !b) {
      return 0;
    }

    if (a === b) {
      return 100;
    }

    const matrix =
      Array.from(
        {
          length:
            a.length + 1,
        },
        () =>
          Array(
            b.length + 1
          ).fill(0)
      );

    for (
      let i = 0;
      i <= a.length;
      i++
    ) {
      matrix[i][0] = i;
    }

    for (
      let j = 0;
      j <= b.length;
      j++
    ) {
      matrix[0][j] = j;
    }

    for (
      let i = 1;
      i <= a.length;
      i++
    ) {

      for (
        let j = 1;
        j <= b.length;
        j++
      ) {

        const cost =
          a[i - 1] ===
          b[j - 1]
            ? 0
            : 1;

        matrix[i][j] =
          Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] +
              cost
          );
      }
    }

    const distance =
      matrix[a.length][b.length];

    const maxLength =
      Math.max(
        a.length,
        b.length
      );

    if (maxLength === 0) {
      return 100;
    }

    return Math.round(
      (
        1 -
        distance / maxLength
      ) * 100
    );
  }

  // ==========================================================
  // NAME SIMILARITY
  // ==========================================================

  calculateNameSimilarity(
    invoiceName,
    itemName,
    itemDescription
  ) {

    const invoice =
      this.normalizeName(
        invoiceName
      );

    const name =
      this.normalizeName(
        itemName
      );

    const description =
      this.normalizeName(
        itemDescription
      );

    if (!invoice) {
      return 0;
    }

    // Exact
    if (
      invoice === name ||
      invoice === description
    ) {
      return 100;
    }

    // Token matching
    const invoiceTokens =
      invoice
        .split(" ")
        .filter(Boolean);

    const itemTokens =
      name
        .split(" ")
        .filter(Boolean);

    if (
      !invoiceTokens.length ||
      !itemTokens.length
    ) {
      return 0;
    }

    let matchedTokens = 0;

    for (
      const invoiceToken
      of invoiceTokens
    ) {

      const found =
        itemTokens.some(
          itemToken =>
            itemToken ===
              invoiceToken ||
            itemToken.includes(
              invoiceToken
            ) ||
            invoiceToken.includes(
              itemToken
            )
        );

      if (found) {
        matchedTokens++;
      }
    }

    const tokenScore =
      Math.round(
        (
          matchedTokens /
          invoiceTokens.length
        ) * 100
      );

    // Containment
    let containment = 0;

    if (
      name.includes(invoice)
    ) {
      containment = 95;
    } else if (
      invoice.includes(name)
    ) {
      containment = 90;
    }

    // Character similarity
    const characterScore =
      this.levenshteinSimilarity(
        invoice,
        name
      );

    // Description similarity
    let descriptionScore = 0;

    if (description) {

      if (
        invoice ===
        description
      ) {

        descriptionScore = 100;

      } else if (
        description.includes(
          invoice
        )
      ) {

        descriptionScore = 90;

      } else {

        descriptionScore =
          this.levenshteinSimilarity(
            invoice,
            description
          );
      }
    }

    return Math.max(
      containment,
      tokenScore,
      characterScore,
      descriptionScore
    );
  }

  // ==========================================================
  // FORMAT ITEM
  // ==========================================================

  formatItem(item) {

    if (!item) {
      return null;
    }

    return {
      id:
        item.id,

      itemName:
        item.itemName || "",

      description:
        item.description || "",

      itemType:
        item.itemType ||
        "goods",

      unit:
        item.unit || "",

      itemCode:
        item.itemCode || "",

      barcode:
        item.barcode || "",

      hsn:
        item.hsn || "",

      sac:
        item.sac || "",

      gstType:
        item.gstType || "",

      mrp:
        this.toNumber(
          item.mrp
        ),

      purchaseRate:
        this.toNumber(
          item.purchaseRate
        ),

      salesRate:
        this.toNumber(
          item.salesRate
        ),

      availableStock:
        this.toNumber(
          item.availableStock?.total ??
          item.stock?.available ??
          item.totalStock ??
          item.availableStockQty ??
          0
        ),

      totalStock:
        this.toNumber(
          item.totalStock ??
          item.stock?.total ??
          item.availableStock?.total ??
          0
        ),

      availableStockQty:
        this.toNumber(
          item.availableStockQty ??
          item.stock?.available ??
          item.availableStock?.total ??
          item.totalStock ??
          0
        ),

      reservedStock:
        this.toNumber(
          item.reservedStock ??
          item.stock?.reserved ??
          0
        ),

      minimumStock:
        item.minimumStock !==
        null
          ? this.toNumber(
              item.minimumStock
            )
          : null,

      parStock:
        item.parStock !==
        null
          ? this.toNumber(
              item.parStock
            )
          : null,

      groupId:
        item.groupId ||
        null,

      groupName:
        item.groupName ||
        item.group?.name ||
        "",

      categoryId:
        item.categoryId ||
        null,

      categoryName:
        item.categoryName ||
        item.category?.name ||
        "",

      brandId:
        item.brandId ||
        null,

      brandName:
        item.brandName ||
        item.brand?.name ||
        "",

      isActive:
        item.isActive !== false,

      notForSale:
        item.notForSale ===
        true,

      isTrackable:
        item.isTrackable ===
        true,

      trackSerialNumber:
        item.trackSerialNumber ===
        true,

      isEnhancedBatchTrackingEnabledForItem:
        item.isEnhancedBatchTrackingEnabledForItem ===
        true,

      isExpiryRequiredForEnhancedBatch:
        item.isExpiryRequiredForEnhancedBatch ===
        true,

      isExposedOnline:
        item.isExposedOnline ===
        true,

      openQtyPopup:
        item.openQtyPopup ===
        true,

      openPricePopup:
        item.openPricePopup ===
        true,

      organizationId:
        item.organizationId ||
        null,

      createdAt:
        item.createdAt ||
        null,

      updatedAt:
        item.updatedAt ||
        null,

      metafields:
        Array.isArray(
          item.metafields
        )
          ? item.metafields
          : [],
    };
  }

  // ==========================================================
  // FIND BEST MATCH
  // ==========================================================
async findBestMatch(
  invoiceProduct,
  petpoojaItems
) {

  if (
    !Array.isArray(petpoojaItems) ||
    !petpoojaItems.length
  ) {

    return {
      status: "UNMATCHED",

      confidence: 0,

      confidenceLabel:
        "No Match",

      petpoojaItem:
        null,

      petpoojaItems:
        [],

      candidates:
        [],

      reasons:
        [],

      reason:
        "No matching Petpooja product found",
    };

  }

  const scored =
    petpoojaItems
      .map(item => {

        const result =
          scoreProduct(
            invoiceProduct,
            item
          );

        return {
          ...result,
          item,
        };

      })
      .filter(
        candidate =>
          candidate.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  if (!scored.length) {

    return {
      status: "UNMATCHED",

      confidence: 0,

      confidenceLabel:
        "No Match",

      petpoojaItem:
        null,

      petpoojaItems:
        [],

      candidates:
        [],

      reasons:
        [],

      reason:
        "No sufficiently similar product found",
    };

  }

  const best =
    scored[0];

  if (best.score < 40) {

    return {
      status: "UNMATCHED",

      confidence: 0,

      confidenceLabel:
        "No Match",

      petpoojaItem:
        null,

      petpoojaItems:
        [],

      candidates:
        scored.slice(0, 10),

      reasons:
        [],

      reason:
        "No sufficiently similar product name found",
    };

  }

  return {

    status:
      "PENDING_CONFIRMATION",

    confidence:
      best.confidence,

    confidenceLabel:
      best.confidenceLabel,

petpoojaItem:
  best.item,

petpoojaItems:
  scored
    .slice(0, 10)
    .map(x => x.item),

candidates:
  scored.slice(0, 10),

    reasons:
      best.reasons,

    reason:
      "User confirmation required",

  };
}
  // async findBestMatch(
  //   invoiceProduct,
  //   petpoojaItems
  // ) {

  //   if (
  //     !Array.isArray(
  //       petpoojaItems
  //     )
  //   ) {
  //     throw new Error(
  //       "Petpooja items is not an array"
  //     );
  //   }

  //   const invoiceName =
  //     this.normalizeName(
  //       invoiceProduct?.description
  //     );

  //   const invoiceHsn =
  //     String(
  //       invoiceProduct?.hsn ||
  //       ""
  //     ).trim();

  //   const invoiceMrp =
  //     this.toNumber(
  //       invoiceProduct?.mrp
  //     );

  //   if (!invoiceName) {
  //     return {
  //       status:
  //         "UNMATCHED",

  //       confidence: 0,

  //       confidenceLabel:
  //         "No Match",

  //       petpoojaItem:
  //         null,

  //       candidates: [],

  //       reasons: [],

  //       reason:
  //         "Invoice product name is empty",
  //     };
  //   }

  //   const candidates = [];

  //   // ========================================================
  //   // SCORE
  //   // ========================================================

  //   for (
  //     const item of petpoojaItems
  //   ) {

  //     const itemName =
  //       this.normalizeName(
  //         item?.itemName
  //       );

  //     const itemDescription =
  //       this.normalizeName(
  //         item?.description
  //       );

  //     const itemHsn =
  //       String(
  //         item?.hsn || ""
  //       ).trim();

  //     const itemMrp =
  //       this.toNumber(
  //         item?.mrp
  //       );

  //     if (
  //       !itemName &&
  //       !itemDescription
  //     ) {
  //       continue;
  //     }

  //     const nameScore =
  //       this.calculateNameSimilarity(
  //         invoiceName,
  //         itemName,
  //         itemDescription
  //       );

  //     if (
  //       nameScore < 25
  //     ) {
  //       continue;
  //     }

  //     let score =
  //       Math.round(
  //         nameScore * 0.8
  //       );

  //     const reasons = [];

  //     if (
  //       nameScore >= 95
  //     ) {

  //       reasons.push(
  //         "name_exact"
  //       );

  //     } else if (
  //       nameScore >= 85
  //     ) {

  //       reasons.push(
  //         "name_very_high_similarity"
  //       );

  //     } else if (
  //       nameScore >= 70
  //     ) {

  //       reasons.push(
  //         "name_high_similarity"
  //       );

  //     } else if (
  //       nameScore >= 50
  //     ) {

  //       reasons.push(
  //         "name_medium_similarity"
  //       );

  //     } else {

  //       reasons.push(
  //         "name_low_similarity"
  //       );
  //     }

  //     if (
  //       invoiceName &&
  //       itemDescription &&
  //       invoiceName ===
  //         itemDescription
  //     ) {

  //       score += 20;

  //       reasons.push(
  //         "description_exact"
  //       );
  //     }

  //     if (
  //       invoiceHsn &&
  //       itemHsn &&
  //       invoiceHsn === itemHsn
  //     ) {

  //       score += 5;

  //       reasons.push(
  //         "hsn_match"
  //       );
  //     }

  //     if (
  //       invoiceMrp > 0 &&
  //       itemMrp > 0 &&
  //       invoiceMrp === itemMrp
  //     ) {

  //       score += 5;

  //       reasons.push(
  //         "mrp_match"
  //       );
  //     }

  //     score =
  //       Math.min(
  //         100,
  //         Math.round(score)
  //       );

  //     candidates.push({
  //       score,

  //       confidence:
  //         score,

  //       confidenceLabel:
  //         this.getConfidenceLabel(
  //           score
  //         ),

  //       reasons,

  //       item,
  //     });
  //   }

  //   if (
  //     !candidates.length
  //   ) {

  //     return {
  //       status:
  //         "UNMATCHED",

  //       confidence: 0,

  //       confidenceLabel:
  //         "No Match",

  //       petpoojaItem:
  //         null,

  //       candidates: [],

  //       reasons: [],

  //       reason:
  //         "No sufficiently similar Petpooja product found",
  //     };
  //   }

  //   candidates.sort(
  //     (a, b) =>
  //       b.score - a.score
  //   );

  //   const best =
  //     candidates[0];

  //   // ========================================================
  //   // GET COMPLETE ITEM
  //   // ========================================================

  //   let fullItem =
  //     best.item;

  //   try {

  //     const detail =
  //       await petpooja.getItemById(
  //         best.item.id
  //       );

  //     if (detail) {
  //       fullItem = detail;
  //     }

  //   } catch (error) {

  //     console.error(
  //       "[Purchase Mapper] Item detail fetch failed:",
  //       error.message
  //     );
  //   }

  //   // ========================================================
  //   // EXISTING MAPPING
  //   // ========================================================

  //   const invoiceDescription =
  //     this.normalizeName(
  //       invoiceProduct?.description
  //     );

  //   const metafieldInfo =
  //     parsePurchaseMappingMetafield(
  //       fullItem?.metafields
  //     );

  //   const existingNames =
  //     metafieldInfo.invoiceNames ||
  //     [];

  //   const alreadyMapped =
  //     existingNames.some(
  //       name =>
  //         this.normalizeName(
  //           name
  //         ) ===
  //         invoiceDescription
  //     );

  //   if (alreadyMapped) {

  //     return {
  //       status:
  //         "ALREADY_MAPPED",

  //       confidence: 100,

  //       confidenceLabel:
  //         "Already Mapped",

  //       petpoojaItem:
  //         this.formatItem(
  //           fullItem
  //         ),

  //       candidates:
  //         candidates
  //           .slice(0, 5)
  //           .map(c => ({
  //             score:
  //               c.score,

  //             confidence:
  //               c.score,

  //             confidenceLabel:
  //               this.getConfidenceLabel(
  //                 c.score
  //               ),

  //             reasons:
  //               c.reasons,

  //             item:
  //               this.formatItem(
  //                 c.item
  //               ),
  //           })),

  //       reasons: [
  //         "purchase_mapping_exists",
  //       ],

  //       reason:
  //         "Product was previously mapped",
  //     };
  //   }

  //   // ========================================================
  //   // RETURN
  //   // ========================================================

  //   return {
  //     status:
  //       "PENDING_CONFIRMATION",

  //     confidence:
  //       best.score,

  //     confidenceLabel:
  //       this.getConfidenceLabel(
  //         best.score
  //       ),

  //     petpoojaItem:
  //       this.formatItem(
  //         fullItem
  //       ),

  //     candidates:
  //       candidates
  //         .slice(0, 5)
  //         .map(c => ({
  //           score:
  //             c.score,

  //           confidence:
  //             c.score,

  //           confidenceLabel:
  //             this.getConfidenceLabel(
  //               c.score
  //             ),

  //           reasons:
  //             c.reasons,

  //           item:
  //             this.formatItem(
  //               c.item
  //             ),
  //         })),

  //     reasons:
  //       best.reasons,

  //     reason:
  //       "User confirmation required",
  //   };
  // }

  // ==========================================================
  // MAP INVOICE
  // ==========================================================

async mapInvoice(invoice, supplier) {

  if (!invoice) {
    throw new Error("invoice is required");
  }

  // --------------------------------------------------------
  // SUPPLIER
  // --------------------------------------------------------

  const supplierId = Number(
    supplier?.supplierId ||
    supplier?.id
  );

  const partyCode = String(
    supplier?.partyCode || ""
  )
    .trim()
    .toUpperCase();

  if (!Number.isFinite(supplierId)) {
    throw new Error(
      "Supplier ID is required"
    );
  }

  if (!partyCode) {
    throw new Error(
      "Supplier party code is required"
    );
  }

  const itemCodePrefix = `${partyCode}-`;

  // --------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------

  const products =
    Array.isArray(invoice.products)
      ? invoice.products
      : Array.isArray(invoice.items)
        ? invoice.items
        : [];

  if (!products.length) {
    throw new Error(
      "invoice.products or invoice.items must be a non-empty array"
    );
  }

  const items = [];

  // ========================================================
  // PROCESS EACH INVOICE PRODUCT
  // ========================================================

  for (let i = 0; i < products.length; i++) {

    const invoiceProduct = {
      ...products[i],

      lineNumber:
        products[i].lineNumber ||
        i + 1,
    };

    try {

      const invoiceName =
        String(
          invoiceProduct.description ||
          invoiceProduct.name ||
          ""
        ).trim();

      if (!invoiceName) {

        items.push({
          lineNumber:
            invoiceProduct.lineNumber,

          invoiceProduct,

          mapping: {
            status: "UNMATCHED",
            confidence: 0,
            confidenceLabel: "No Match",
            petpoojaItem: null,
            candidates: [],
            reasons: [],
            reason:
              "Invoice product description is empty",
          },
        });

        continue;
      }

      // ====================================================
      // 1. CHECK OUR MONGODB FIRST
      // ====================================================

      const invoiceNameNormalized =
        this.normalizeName(
          invoiceName
        );

      const savedMapping =
        await PurchaseProductMapping.findOne({
          supplierId,
          invoiceNameNormalized,
        }).lean();

      // ====================================================
      // ALREADY MAPPED
      // ====================================================

      if (
        savedMapping &&
        Array.isArray(
          savedMapping.petpoojaItems
        ) &&
        savedMapping.petpoojaItems.length
      ) {

        console.log(
          "[Purchase Mapper] Existing Mongo mapping:",
          invoiceName,
          savedMapping.petpoojaItems.map(
            x => x.petpoojaItemId
          )
        );

        // ----------------------------------------------
        // GET CURRENT PETPOOJA ITEMS
        // ----------------------------------------------

        const mappedItems = [];

        for (
          const mappedItem
          of savedMapping.petpoojaItems
        ) {

          try {

            const petpoojaItem =
              await petpooja.getItemById(
                mappedItem.petpoojaItemId
              );

            if (petpoojaItem) {

              // Safety check:
              // still belongs to supplier
              const code =
                String(
                  petpoojaItem.itemCode ||
                  ""
                )
                  .trim()
                  .toUpperCase();

              if (
                code.startsWith(
                  itemCodePrefix
                )
              ) {

                mappedItems.push(
                  petpoojaItem
                );
              }

            }

          } catch (error) {

            console.error(
              `[Purchase Mapper] Failed loading mapped item ${mappedItem.petpoojaItemId}:`,
              error.message
            );

          }

        }

        // ----------------------------------------------
        // RETURN ALREADY MAPPED
        // ----------------------------------------------

        if (mappedItems.length) {

          items.push({

            lineNumber:
              invoiceProduct.lineNumber,

            invoiceProduct,

            mapping: {

              status:
                "ALREADY_MAPPED",

              confidence:
                100,

              confidenceLabel:
                "Already Mapped",

              // First item for backward compatibility
              petpoojaItem:
                mappedItems[0],

              // NEW
              petpoojaItems:
                mappedItems,

              candidates:
                mappedItems.map(
                  item => ({
                    score: 100,
                    confidence: 100,
                    confidenceLabel:
                      "Already Mapped",
                    reasons: [
                      "mongodb_mapping"
                    ],
                    item,
                  })
                ),

              reasons: [
                "mongodb_mapping"
              ],

              reason:
                "Product mapping found in database",
            },

          });

          continue;
        }
      }

      // ====================================================
      // 2. SEARCH PETPOOJA
      // ====================================================

      const queries =
        buildSearchQueries(
          invoiceName
        );

      const candidateMap =
        new Map();

      for (
        const query
        of queries
      ) {

        try {

          console.log(
            `[Purchase Mapper] Searching Petpooja: "${query}"`
          );

          const response =
            await petpooja.searchItems({
              name: query,
            });

          let results = [];

          if (
            Array.isArray(
              response?.data
            )
          ) {

            results =
              response.data;

          } else if (
            Array.isArray(
              response?.items
            )
          ) {

            results =
              response.items;

          } else if (
            Array.isArray(
              response
            )
          ) {

            results =
              response;

          }

          // ==================================================
          // IMPORTANT:
          //
          // ONLY SUPPLIER PRODUCTS
          //
          // CH → CH-*
          // RB → RB-*
          // PEPSICO → PEPSICO-*
          // ==================================================

          const supplierResults =
            results.filter(
              item => {

                const code =
                  String(
                    item?.itemCode ||
                    ""
                  )
                    .trim()
                    .toUpperCase();

                return code.startsWith(
                  itemCodePrefix
                );
              }
            );

          for (
            const item
            of supplierResults
          ) {

            if (
              item?.id != null
            ) {

              candidateMap.set(
                String(item.id),
                item
              );

            }

          }

        } catch (error) {

          console.error(
            `[Purchase Mapper] Search failed "${query}":`,
            error.message
          );

        }

      }

      const petpoojaItems =
        Array.from(
          candidateMap.values()
        );

      console.log(
        "[Purchase Mapper] Supplier candidates:",
        invoiceName,
        petpoojaItems.length
      );

      // ====================================================
      // 3. FIND BEST MATCH
      // ====================================================

      const mapping =
        await this.findBestMatch(
          invoiceProduct,
          petpoojaItems
        );

      // ====================================================
      // IMPORTANT:
      //
      // findBestMatch MUST NOT check Petpooja description
      // for ALREADY_MAPPED.
      //
      // Only MongoDB decides that.
      // ====================================================

      if (
        mapping?.status ===
        "ALREADY_MAPPED"
      ) {

        mapping.status =
          "PENDING_CONFIRMATION";

        mapping.reason =
          "User confirmation required";
      }

      items.push({

        lineNumber:
          invoiceProduct.lineNumber,

        invoiceProduct,

        mapping,

      });

    } catch (error) {

      console.error(
        "[Purchase Mapper] Product mapping error:",
        invoiceProduct.description,
        error.message
      );

      items.push({

        lineNumber:
          invoiceProduct.lineNumber,

        invoiceProduct,

        mapping: {

          status:
            "UNMATCHED",

          confidence:
            0,

          confidenceLabel:
            "No Match",

          petpoojaItem:
            null,

          petpoojaItems:
            [],

          candidates:
            [],

          reasons:
            [],

          reason:
            error.message,

        },

      });

    }

  }

  // ========================================================
  // SUMMARY
  // ========================================================

  return {

    ...invoice,

    products,

    supplier: {

      id:
        supplierId,

      name:
        supplier?.supplierName ||
        supplier?.name ||
        "",

      partyCode,

    },

    mapping: {

      totalProducts:
        items.length,

      alreadyMapped:
        items.filter(
          x =>
            x.mapping?.status ===
            "ALREADY_MAPPED"
        ).length,

      pendingConfirmation:
        items.filter(
          x =>
            x.mapping?.status ===
            "PENDING_CONFIRMATION"
        ).length,

      highConfidence:
        items.filter(
          x =>
            x.mapping?.status ===
              "PENDING_CONFIRMATION" &&
            x.mapping?.confidence >= 80
        ).length,

      mediumConfidence:
        items.filter(
          x =>
            x.mapping?.status ===
              "PENDING_CONFIRMATION" &&
            x.mapping?.confidence >= 50 &&
            x.mapping?.confidence < 80
        ).length,

      lowConfidence:
        items.filter(
          x =>
            x.mapping?.status ===
              "PENDING_CONFIRMATION" &&
            x.mapping?.confidence > 0 &&
            x.mapping?.confidence < 50
        ).length,

      unmatched:
        items.filter(
          x =>
            x.mapping?.status ===
            "UNMATCHED"
        ).length,

      items,

    },

  };
}

  // ==========================================================
  // CONFIRM MULTIPLE MAPPING
  // ==========================================================
  //
  // Invoice product
  //       ↓
  // multiple Petpooja products
  //
  // Example:
  //
  // DAVIDOFF COFFEE CANDY
  //       ↓
  // CH-210
  // CH-211
  //
  // Each Petpooja item gets its own
  // purchaseMapping metafield.
  //
  // ==========================================================




// ==========================================================
// NORMALIZE NAME
// ==========================================================

normalizeName(value) {

  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}


// ==========================================================
// CONFIRM MULTI PRODUCT MAPPING
// ==========================================================
async confirmMapping({
  invoiceProduct,
  petpoojaItemIds,
  supplierPartyCode,
  supplierId,
}) {
  // --------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------

  if (!supplierId) {
    throw new Error("supplierId is required");
  }

  if (!supplierPartyCode) {
    throw new Error("supplierPartyCode is required");
  }

  if (!invoiceProduct) {
    throw new Error("invoiceProduct is required");
  }

  const invoiceName =
    String(invoiceProduct.description || "").trim();

  if (!invoiceName) {
    throw new Error(
      "Invoice product description is required"
    );
  }

  if (
    !Array.isArray(petpoojaItemIds) ||
    petpoojaItemIds.length === 0
  ) {
    throw new Error(
      "petpoojaItemIds must contain at least one product"
    );
  }

  // --------------------------------------------------------
  // SUPPLIER
  // --------------------------------------------------------

  const numericSupplierId = Number(supplierId);

  if (!Number.isFinite(numericSupplierId)) {
    throw new Error("Invalid supplierId");
  }

  const partyCode =
    String(supplierPartyCode)
      .trim()
      .toUpperCase();

  // --------------------------------------------------------
  // CLEAN IDS
  // --------------------------------------------------------

  const itemIds = [
    ...new Set(
      petpoojaItemIds
        .map(Number)
        .filter(id => Number.isFinite(id))
    ),
  ];

  if (!itemIds.length) {
    throw new Error("No valid Petpooja item IDs");
  }

  // --------------------------------------------------------
  // GET PETPOOJA ITEMS
  // --------------------------------------------------------

  const petpoojaItems = [];

  for (const itemId of itemIds) {
    const item =
      await petpooja.getItemById(itemId);

    if (!item) {
      throw new Error(
        `Petpooja item not found: ${itemId}`
      );
    }

    const itemCode =
      String(item.itemCode || "").trim();

    // ------------------------------------------------------
    // SUPPLIER PREFIX CHECK
    // ------------------------------------------------------

    if (
      !itemCode
        .toUpperCase()
        .startsWith(`${partyCode}-`)
    ) {
      throw new Error(
        `Product ${itemCode} does not belong to supplier ${partyCode}`
      );
    }

    petpoojaItems.push({
      petpoojaItemId: Number(item.id),
      itemCode,
      itemName:
        String(item.itemName || "").trim(),
    });
  }

  // --------------------------------------------------------
  // NORMALIZE INVOICE NAME
  // --------------------------------------------------------

  const invoiceNameNormalized =
    this.normalizeName(invoiceName);

  // --------------------------------------------------------
  // FIND EXISTING
  // --------------------------------------------------------

  const existing =
    await PurchaseProductMapping.findOne({
      supplierId: numericSupplierId,
      invoiceNameNormalized,
    });
const mappedItems = petpoojaItems;
  // --------------------------------------------------------
  // MERGE EXISTING + NEW PRODUCTS
  // --------------------------------------------------------

  // const existingItems =
  //   Array.isArray(existing?.petpoojaItems)
  //     ? existing.petpoojaItems
  //     : [];

  // const mergedMap = new Map();

  // for (const item of existingItems) {
  //   mergedMap.set(
  //     Number(item.petpoojaItemId),
  //     item
  //   );
  // }

  // for (const item of petpoojaItems) {
  //   mergedMap.set(
  //     Number(item.petpoojaItemId),
  //     item
  //   );
  // }

  // const mergedItems =
  //   Array.from(mergedMap.values());

  // --------------------------------------------------------
  // SAVE
  // --------------------------------------------------------

const mapping =
  await PurchaseProductMapping.findOneAndUpdate(
    {
      supplierId: numericSupplierId,
      invoiceNameNormalized,
    },
    {
      $set: {
        supplierId: numericSupplierId,
        supplierPartyCode: partyCode,
        invoiceName,
        invoiceNameNormalized,
        petpoojaItems: mappedItems,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  // --------------------------------------------------------
  // RESPONSE
  // --------------------------------------------------------

return {
  success: true,

  alreadyMapped: Boolean(existing),

  supplierId: numericSupplierId,

  supplierPartyCode: partyCode,

  invoiceProduct,

  invoiceName,

  petpoojaItemIds:
    mappedItems.map(
      item => item.petpoojaItemId
    ),

  mappedItems,

  mappingId:
    mapping._id,

  message: existing
    ? "Mapping updated successfully"
    : "Mapping created successfully",
};
}
}

module.exports =
  new PurchaseMapperService();