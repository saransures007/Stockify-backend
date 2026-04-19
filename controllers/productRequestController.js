// controllers/productRequest.controller.js
const service = require('../services/productRequest');

// controllers/productRequest.controller.js


exports.create = async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      description
    } = req.body;

    // ✅ Basic validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    const data = await service.createRequest({
      name,
      category,
      brand,
      description,
      user: req.user,
      deviceId: req.headers["x-device-id"],
      ip: req.ip
    });

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
exports.vote = async (req, res) => {
  try {
    const data = await service.voteProduct({
      productId: req.body.productId,
      user: req.user,
      deviceId: req.headers["x-device-id"],
      ip: req.ip
    });

    res.json({ success: true, data });

  } catch (err) {
    if (err.message === "Already voted") {
      return res.json({ success: false, message: err.message });
    }

    res.status(500).json({ success: false, message: err.message });
  }
};
const searchService = require("../services/search.service");

exports.search = async (req, res) => {
  try {
    const query = req.query.q;

    const data = await searchService.searchAll(query);

    res.json({
      success: true,
      query,
      count: data.length,
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.trending = async (req, res) => {
  try {
    const data = await service.getTrending();

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// controllers/productRequest.controller.js

exports.searchTrending = async (req, res) => {
  try {
    const query = req.query.q || "";

    const data = await service.searchTrending(query);

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};