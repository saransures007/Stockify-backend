const express = require('express');
const router = express.Router();

const {
  getPetpoojaItems,
  getPetpoojaItemById,
  getMasterData,
  getActiveMasterData,
  searchPetpoojaItems,
  createPetpoojaItem,
  getPetpoojaSuppliers,
  updateStockAdjustment,
  createStockAdjustment,
  createPurchaseBill
} = require('../controllers/petpoojaController');

router.put(
  "/stock-adjustments/:id",
  updateStockAdjustment
);


router.post(
  "/bills",
  createPurchaseBill
);

router.post(
  "/stock-adjustments",
  createStockAdjustment
);


router.get(
  "/suppliers",
  getPetpoojaSuppliers
);

// 🔹 ITEMS
router.get('/items', getPetpoojaItems);
router.get('/items/:id', getPetpoojaItemById);
router.get("/items-search", searchPetpoojaItems);
router.get('/master-data', getMasterData);
// CREATE
router.post(
  "/items",
  createPetpoojaItem
);

// 🔥 BEST FOR UI (use this)
router.get('/master-data/active', getActiveMasterData);

module.exports = router;