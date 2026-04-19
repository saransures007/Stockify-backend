// routes/productRequest.routes.js
const express = require('express');
const router = express.Router();

const controller = require('../controllers/productRequestController');
const {
  anonymousVoteLimiter,
  voteLimiter
} = require('../middleware/rateLimit');

// 🔍 search
router.get('/search', controller.search);

// ➕ create request
router.post('/create', anonymousVoteLimiter, controller.create);

// 👍 vote
router.post('/vote', voteLimiter, controller.vote);

// routes/productRequest.routes.js

router.get("/trending", controller.trending);
// routes/productRequest.routes.js

router.get("/trending/search", controller.searchTrending);
module.exports = router;