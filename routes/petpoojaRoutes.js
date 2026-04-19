const express = require('express');
const router = express.Router();

const {
  getPetpoojaItems,
  getPetpoojaItemById,
  getMasterData,
  getActiveMasterData
} = require('../controllers/petpoojaController');

// 🔹 ITEMS
router.get('/items', getPetpoojaItems);
router.get('/items/:id', getPetpoojaItemById);

// 🔹 MASTER DATA
router.get('/master-data', getMasterData);

// 🔥 BEST FOR UI (use this)
router.get('/master-data/active', getActiveMasterData);

module.exports = router;