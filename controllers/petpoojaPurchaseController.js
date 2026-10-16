// const petpoojaPurchase =
//   require("../services/PetpoojaPurchaseClient");

// const purchaseMapper =
//   require("../services/purchaseMapperService");
// // =====================================================
// // REQUEST OTP
// // POST /api/petpooja/auth/request-otp
// // =====================================================

// const requestOtp = async (req, res) => {

//   try {

//     const {
//       user_contact
//     } = req.body;

//     if (!user_contact) {

//       return res.status(400).json({
//         success: false,
//         message:
//           "user_contact is required",
//       });
//     }

//     const result =
//       await petpoojaPurchase.requestOtp(
//         user_contact
//       );

//     return res.json({
//       success: true,
//       message:
//         "OTP requested successfully",
//       data: result,
//     });

//   } catch (error) {

//     console.error(
//       "[Petpooja] Request OTP error:",
//       error.response?.data ||
//       error.message
//     );

//     return res.status(
//       error.response?.status || 500
//     ).json({
//       success: false,
//       message:
//         error.response?.data?.message ||
//         error.message ||
//         "Failed to request Petpooja OTP",
//     });
//   }
// };


// // =====================================================
// // VERIFY OTP
// // POST /api/petpooja/auth/verify-otp
// // =====================================================

// const verifyOtp = async (req, res) => {

//   try {

//     const {
//       otp,
//       user,
//       user_contact,
//     } = req.body;

//     if (!otp) {

//       return res.status(400).json({
//         success: false,
//         message: "OTP is required",
//       });
//     }

//     if (!user) {

//       return res.status(400).json({
//         success: false,
//         message:
//           "Petpooja user is required",
//       });
//     }

//     const result =
//       await petpoojaPurchase.verifyOtp({
//         otp,
//         user,
//         userContact:
//           user_contact,
//       });

//     return res.json({
//       success: true,
//       message:
//         "Petpooja authentication successful",

//       data: {
//         user:
//           result.user,

//         expiry:
//           result.expiry,

//         message:
//           result.message,
//       },
//     });

//   } catch (error) {

//     console.error(
//       "[Petpooja] Verify OTP error:",
//       error.response?.data ||
//       error.message
//     );

//     return res.status(
//       error.response?.status || 500
//     ).json({
//       success: false,
//       message:
//         error.response?.data?.message ||
//         error.message ||
//         "OTP verification failed",
//     });
//   }
// };


// // =====================================================
// // GET PURCHASE INVOICES
// // GET /api/petpooja/purchases
// // =====================================================

// const getPurchaseInvoices = async (
//   req,
//   res
// ) => {

//   try {

//     const {
//       invoice_status_group =
//         "uploaded",

//       sort_by =
//         "createdAt",

//       sort_order =
//         "DESC",

//       page =
//         1,

//       page_size =
//         10,
//     } = req.query;


//     const result =
//       await petpoojaPurchase.getInvoiceList({

//         invoiceStatusGroup:
//           invoice_status_group,

//         sortBy:
//           sort_by,

//         sortOrder:
//           sort_order,

//         page:
//           Number(page),

//         pageSize:
//           Number(page_size),
//       });


//     return res.json({

//       success: true,

//       message:
//         "Petpooja purchase invoices fetched successfully",

//       data: result,

//     });

//   } catch (error) {

//     console.error(
//       "[Petpooja] Invoice list error:",
//       error.response?.data ||
//       error.message
//     );

//     const status =
//       error.message ===
//       "Petpooja authentication required"
//         ? 401
//         : error.response?.status || 500;

//     return res.status(status).json({

//       success: false,

//       message:
//         error.response?.data?.message ||
//         error.message ||
//         "Failed to fetch purchase invoices",

//     });
//   }
// };


// // =====================================================
// // GET PURCHASE INVOICE DETAIL
// // GET /api/petpooja/purchases/:id
// // =====================================================

// const getPurchaseInvoiceDetail = async (
//   req,
//   res
// ) => {

//   try {

//     const {
//       id
//     } = req.params;


//     if (!id) {

//       return res.status(400).json({

//         success: false,

//         message:
//           "Invoice ID is required",

//       });
//     }


//     const result =
//       await petpoojaPurchase
//         .getInvoiceDetail(id);


//     return res.json({

//       success: true,

//       message:
//         "Petpooja purchase invoice fetched successfully",

//       data: result,

//     });

//   } catch (error) {

//     console.error(
//       "[Petpooja] Invoice detail error:",
//       error.response?.data ||
//       error.message
//     );

//     const status =
//       error.message ===
//       "Petpooja authentication required"
//         ? 401
//         : error.response?.status || 500;

//     return res.status(status).json({

//       success: false,

//       message:
//         error.response?.data?.message ||
//         error.message ||
//         "Failed to fetch invoice detail",

//     });
//   }
  
// };

// const checkAuth = async (req, res) => {
//   try {
//     const authenticated =
//       petpoojaPurchase.isAuthenticated();

//     console.log("Petpooja auth:", authenticated);

//     return res.json({
//       success: true,
//       authenticated
//     });

//   } catch (error) {
//     console.error("[Petpooja] Auth status error:", error);

//     return res.status(500).json({
//       success: false,
//       authenticated: false,
//       message: "Unable to check Petpooja authentication"
//     });
//   }
// };
// // =====================================================
// // MAP INVOICE
// // POST /api/petpooja/purchases/map
// // =====================================================

// // =====================================================
// // MAP INVOICE
// // POST /api/petpooja/purchases/map
// // =====================================================

// const mapInvoice = async (req, res) => {
//   try {
//     const { invoice, supplier } = req.body;

//     if (!invoice) {
//       return res.status(400).json({
//         success: false,
//         message: "invoice is required",
//       });
//     }

//     if (!supplier) {
//       return res.status(400).json({
//         success: false,
//         message: "supplier is required",
//       });
//     }

//     const partyCode = String(
//       supplier.partyCode || ""
//     )
//       .trim()
//       .toUpperCase();

//     if (!partyCode) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Selected supplier does not have a party code",
//       });
//     }

//     console.log(
//       "[Purchase Mapper] Supplier:",
//       supplier.name
//     );

//     console.log(
//       "[Purchase Mapper] Party Code:",
//       partyCode
//     );

//     const result =
//       await purchaseMapper.mapInvoice(
//         invoice,
//         {
//           supplierId: supplier.id,
//           supplierName: supplier.name,
//           partyCode,
//         }
//       );

//     return res.json({
//       success: true,
//       data: result,
//     });

//   } catch (error) {
//     console.error(
//       "[Purchase Mapper]",
//       error.response?.data ||
//       error.message
//     );

//     return res.status(
//       error.response?.status || 500
//     ).json({
//       success: false,
//       message:
//         error.message ||
//         "Mapping failed",
//     });
//   }
// };

// // =====================================================
// // CONFIRM MULTIPLE PETPOOJA PRODUCT MAPPING
// // POST /api/petpooja/purchases/map/confirm
// // =====================================================

// // =====================================================
// // CONFIRM MAPPING
// // POST /api/petpooja/purchases/map/confirm
// // =====================================================

// // =====================================================
// // CONFIRM MAPPING
// // POST /api/petpooja/purchases/map/confirm
// // =====================================================

// const confirmMapping = async (req, res) => {
//   try {
//     const {
//       invoiceProduct,
//       petpoojaItemIds,
//       supplierPartyCode,
//       supplierId,
//     } = req.body;

//     // -----------------------------------------------
//     // VALIDATION
//     // -----------------------------------------------

//     if (!invoiceProduct) {
//       return res.status(400).json({
//         success: false,
//         message: "invoiceProduct is required",
//       });
//     }

//     if (
//       !Array.isArray(petpoojaItemIds) ||
//       petpoojaItemIds.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "petpoojaItemIds must be a non-empty array",
//       });
//     }

//     if (!supplierId) {
//       return res.status(400).json({
//         success: false,
//         message: "supplierId is required",
//       });
//     }

//     if (!supplierPartyCode) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "supplierPartyCode is required",
//       });
//     }

//     // -----------------------------------------------
//     // CONFIRM MAPPING
//     // -----------------------------------------------

//     const result =
//       await purchaseMapper.confirmMapping({
//         invoiceProduct,

//         petpoojaItemIds,

//         supplierPartyCode,

//         supplierId,
//       });

//     return res.json(result);

//   } catch (error) {

//     console.error(
//       "[Purchase Mapper Confirm]",
//       error.response?.data ||
//         error.message
//     );

//     return res.status(
//       error.response?.status || 500
//     ).json({
//       success: false,
//       message:
//         error.message ||
//         "Mapping confirmation failed",
//     });
//   }
// };
// module.exports = {
//   confirmMapping,
// };


// // =====================================================
// // CONFIRM MAPPING
// // POST /api/petpooja/purchases/map/confirm
// // =====================================================

// // const confirmMapping = async (
// //   req,
// //   res
// // ) => {

// //   try {

// //     const {
// //       invoiceProduct,
// //       petpoojaItemId
// //     } = req.body;


// //     const result =
// //       await purchaseMapper.confirmMapping({

// //         invoiceProduct,

// //         petpoojaItemId

// //       });


// //     return res.json(result);

// //   } catch (error) {

// //     console.error(
// //       "[Purchase Mapper Confirm]",
// //       error.response?.data ||
// //       error.message
// //     );

// //     return res.status(
// //       error.response?.status || 500
// //     ).json({

// //       success: false,

// //       message:
// //         error.message ||
// //         "Mapping confirmation failed"

// //     });

// //   }

// // };

// module.exports = {

//   requestOtp,

//   verifyOtp,

//   getPurchaseInvoices,

//   getPurchaseInvoiceDetail,

//   checkAuth,

//   mapInvoice,

//   confirmMapping

// };

const petpoojaPurchase =
  require("../services/PetpoojaPurchaseClient");

const purchaseMapper =
  require("../services/purchaseMapperService");

const invoiceIntelligence =
  require("../services/invoiceIntelligence");


// =====================================================
// REQUEST OTP
// POST /api/petpooja/auth/request-otp
// =====================================================

const requestOtp = async (
  req,
  res
) => {

  try {

    const {
      user_contact
    } = req.body;


    if (!user_contact) {

      return res.status(400).json({
        success: false,
        message:
          "user_contact is required",
      });

    }


    const result =
      await petpoojaPurchase.requestOtp(
        user_contact
      );


    return res.json({

      success: true,

      message:
        "OTP requested successfully",

      data:
        result,

    });

  } catch (error) {

    console.error(
      "[Petpooja] Request OTP error:",
      error.response?.data ||
        error.message
    );


    return res.status(
      error.response?.status ||
        500
    ).json({

      success: false,

      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to request Petpooja OTP",

    });

  }
};


// =====================================================
// VERIFY OTP
// POST /api/petpooja/auth/verify-otp
// =====================================================

const verifyOtp = async (
  req,
  res
) => {

  try {

    const {
      otp,
      user,
      user_contact,
    } = req.body;


    if (!otp) {

      return res.status(400).json({

        success: false,

        message:
          "OTP is required",

      });

    }


    if (!user) {

      return res.status(400).json({

        success: false,

        message:
          "Petpooja user is required",

      });

    }


    const result =
      await petpoojaPurchase.verifyOtp({

        otp,

        user,

        userContact:
          user_contact,

      });


    return res.json({

      success: true,

      message:
        "Petpooja authentication successful",

      data: {

        user:
          result.user,

        expiry:
          result.expiry,

        message:
          result.message,

      },

    });

  } catch (error) {

    console.error(
      "[Petpooja] Verify OTP error:",
      error.response?.data ||
        error.message
    );


    return res.status(
      error.response?.status ||
        500
    ).json({

      success: false,

      message:
        error.response?.data?.message ||
        error.message ||
        "OTP verification failed",

    });

  }
};


// =====================================================
// GET PURCHASE INVOICES
// GET /api/petpooja/purchases
// =====================================================

const getPurchaseInvoices =
  async (
    req,
    res
  ) => {

    try {

      const {
        invoice_status_group =
          "uploaded",

        sort_by =
          "createdAt",

        sort_order =
          "DESC",

        page =
          1,

        page_size =
          10,

      } = req.query;


      const result =
        await petpoojaPurchase
          .getInvoiceList({

            invoiceStatusGroup:
              invoice_status_group,

            sortBy:
              sort_by,

            sortOrder:
              sort_order,

            page:
              Number(page),

            pageSize:
              Number(page_size),

          });


      return res.json({

        success: true,

        message:
          "Petpooja purchase invoices fetched successfully",

        data:
          result,

      });

    } catch (error) {

      console.error(
        "[Petpooja] Invoice list error:",
        error.response?.data ||
          error.message
      );


      const status =
        error.message ===
        "Petpooja authentication required"
          ? 401
          : error.response?.status ||
            500;


      return res.status(
        status
      ).json({

        success: false,

        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase invoices",

      });

    }

  };


// =====================================================
// GET PURCHASE INVOICE DETAIL
// GET /api/petpooja/purchases/:id
// =====================================================
//
// IMPORTANT:
//
// User clicks invoice
//        ↓
// Petpooja raw invoice
//        ↓
// Invoice Intelligence
//        ↓
// Canonical Invoice
//        ↓
// Review Model
//
// =====================================================

const getPurchaseInvoiceDetail =
  async (
    req,
    res
  ) => {

    try {

      const {
        id
      } = req.params;


      if (!id) {

        return res.status(400).json({

          success: false,

          message:
            "Invoice ID is required",

        });

      }


      // -------------------------------------------------
      // STEP 1
      // Get the original invoice from Petpooja
      // -------------------------------------------------

      const rawInvoice =
        await petpoojaPurchase
          .getInvoiceDetail(
            id
          );


      console.log(
        "[Invoice Intelligence] Raw invoice received:",
        id
      );


      // -------------------------------------------------
      // STEP 2
      // Normalize invoice
      //
      // This handles all four invoice formats.
      // -------------------------------------------------

      const normalized =
        invoiceIntelligence
          .normalizeInvoice(
            rawInvoice,
            {
              supplier:
                rawInvoice?.supplier ||
                null,
            }
          );


      // -------------------------------------------------
      // STEP 3
      // Convert canonical invoice into frontend
      // review model.
      // -------------------------------------------------

      const review =
        invoiceIntelligence
          .mapForReview(
            normalized.canonical
          );


      // -------------------------------------------------
      // STEP 4
      // Return BOTH:
      //
      // raw
      // canonical
      // review
      //
      // Raw is useful for debugging/audit.
      // Frontend should use canonical/review.
      // -------------------------------------------------

      return res.json({

        success: true,

        message:
          "Petpooja purchase invoice processed successfully",

        data: {

          // Original Petpooja response
          raw:
            rawInvoice,

          // Canonical Invoice Intelligence result
          canonical:
            normalized.canonical,

          // Frontend review representation
          review,

          // Normalization statistics
          stats:
            normalized.stats,

          // Validation result
          validation:
            normalized.validation,

        },

      });

    } catch (error) {

      console.error(
        "[Invoice Intelligence] Invoice detail error:",
        error.response?.data ||
          error.message
      );


      const status =
        error.message ===
        "Petpooja authentication required"
          ? 401
          : error.response?.status ||
            500;


      return res.status(
        status
      ).json({

        success: false,

        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to process invoice",

      });

    }

  };


// =====================================================
// CHECK AUTH
// GET /api/petpooja/auth/status
// =====================================================

const checkAuth =
  async (
    req,
    res
  ) => {

    try {

      const authenticated =
        petpoojaPurchase
          .isAuthenticated();


      console.log(
        "Petpooja auth:",
        authenticated
      );


      return res.json({

        success: true,

        authenticated,

      });

    } catch (error) {

      console.error(
        "[Petpooja] Auth status error:",
        error
      );


      return res.status(500).json({

        success: false,

        authenticated: false,

        message:
          "Unable to check Petpooja authentication",

      });

    }

  };


// =====================================================
// MAP INVOICE
// POST /api/petpooja/purchases/map
// =====================================================

const mapInvoice =
  async (
    req,
    res
  ) => {

    try {

      const {
        invoice,
        supplier,
      } = req.body;


      if (!invoice) {

        return res.status(400).json({

          success: false,

          message:
            "invoice is required",

        });

      }


      if (!supplier) {

        return res.status(400).json({

          success: false,

          message:
            "supplier is required",

        });

      }


      const partyCode =
        String(
          supplier.partyCode ||
            ""
        )
          .trim()
          .toUpperCase();


      if (!partyCode) {

        return res.status(400).json({

          success: false,

          message:
            "Selected supplier does not have a party code",

        });

      }


      console.log(
        "[Purchase Mapper] Supplier:",
        supplier.name
      );


      console.log(
        "[Purchase Mapper] Party Code:",
        partyCode
      );


      const result =
        await purchaseMapper
          .mapInvoice(
            invoice,
            {

              supplierId:
                supplier.id,

              supplierName:
                supplier.name,

              partyCode,

            }
          );


      return res.json({

        success: true,

        data:
          result,

      });

    } catch (error) {

      console.error(
        "[Purchase Mapper]",
        error.response?.data ||
          error.message
      );


      return res.status(
        error.response?.status ||
          500
      ).json({

        success: false,

        message:
          error.message ||
          "Mapping failed",

      });

    }

  };


// =====================================================
// CONFIRM MAPPING
// POST /api/petpooja/purchases/map/confirm
// =====================================================

const confirmMapping =
  async (
    req,
    res
  ) => {

    try {

      const {
        invoiceProduct,
        petpoojaItemIds,
        supplierPartyCode,
        supplierId,
      } = req.body;


      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (!invoiceProduct) {

        return res.status(400).json({

          success: false,

          message:
            "invoiceProduct is required",

        });

      }


      if (
        !Array.isArray(
          petpoojaItemIds
        ) ||
        petpoojaItemIds.length ===
          0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "petpoojaItemIds must be a non-empty array",

        });

      }


      if (!supplierId) {

        return res.status(400).json({

          success: false,

          message:
            "supplierId is required",

        });

      }


      if (!supplierPartyCode) {

        return res.status(400).json({

          success: false,

          message:
            "supplierPartyCode is required",

        });

      }


      // -----------------------------------------------
      // CONFIRM MAPPING
      // -----------------------------------------------

      const result =
        await purchaseMapper
          .confirmMapping({

            invoiceProduct,

            petpoojaItemIds,

            supplierPartyCode,

            supplierId,

          });


      return res.json(
        result
      );

    } catch (error) {

      console.error(
        "[Purchase Mapper Confirm]",
        error.response?.data ||
          error.message
      );


      return res.status(
        error.response?.status ||
          500
      ).json({

        success: false,

        message:
          error.message ||
          "Mapping confirmation failed",

      });

    }

  };


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

  requestOtp,

  verifyOtp,

  getPurchaseInvoices,

  getPurchaseInvoiceDetail,

  checkAuth,

  mapInvoice,

  confirmMapping,

};