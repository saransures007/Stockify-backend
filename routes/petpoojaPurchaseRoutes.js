const express = require("express");

const {
  requestOtp,
  verifyOtp,
  getPurchaseInvoices,
  getPurchaseInvoiceDetail,
  checkAuth,
  mapInvoice,
  confirmMapping
} = require("../controllers/petpoojaPurchaseController");

const router = express.Router();


// =====================================================
// AUTH
// =====================================================

router.post(
  "/auth/request-otp",
  requestOtp
);

router.post(
  "/auth/verify-otp",
  verifyOtp
);

router.get(
  "/auth/status",
  checkAuth
);


// =====================================================
// PURCHASES
// =====================================================

router.get(
  "/purchases",
  getPurchaseInvoices
);

router.get(
  "/purchases/:id",
  getPurchaseInvoiceDetail
);


// =====================================================
// PRODUCT MAPPING
// =====================================================

router.post(
  "/purchases/map",
  mapInvoice
);

router.post(
  "/purchases/map/confirm",
  confirmMapping
);


module.exports = router;