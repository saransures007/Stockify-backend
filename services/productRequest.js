// services/productRequest.service.js
const ProductRequest = require('../models/ProductRequest');

const normalize = (str = "") =>
  str.toLowerCase().replace(/\s+/g, " ").trim();

const clean = (v) => (v || "").trim();

exports.createRequest = async ({
  name,
  category,
  brand,
  description,
  user,
  deviceId,
  ip
}) => {
  // ✅ clean inputs
  const originalName = clean(name);
  const normalizedName = normalize(originalName);

  const cleanCategory = clean(category);
  const cleanBrand = clean(brand);
  const cleanDescription = clean(description);

  const existing = await ProductRequest.findOne({ normalizedName });

if (existing) {
  // 🔥 optionally auto-vote creator
  if (!existing.hasUserVoted({ userId: user?.id, deviceId })) {
    existing.votes.push({
      userId: user?.id,
      userEmail: user?.email,
      deviceId: user ? null : deviceId,
      userIp: ip
    });

    await existing.save();
  }

  return existing;
}

  // ✅ create
  return ProductRequest.create({
    productName: normalizedName,
    originalName,
    category: cleanCategory,
    brand: cleanBrand,
    description: cleanDescription,

    requestedBy: {
      userId: user?.id,
      userEmail: user?.email,
      userIp: ip
    }
  });
};

exports.voteProduct = async ({ productId, user, deviceId, ip }) => {
  const product = await ProductRequest.findById(productId);

  if (!product) throw new Error("Product not found");

  const already = product.hasUserVoted({
    userId: user?.id,
    deviceId
  });

  if (already) {
    throw new Error("Already voted");
  }

  product.votes.push({
    userId: user?.id,
    userEmail: user?.email,
    deviceId: user ? null : deviceId,
    userIp: ip
  });

  await product.save();

  return product;
};

exports.searchRequests = async (query) => {
  return ProductRequest.find({
    $text: { $search: query }
  })
    .sort({ voteCount: -1 })
    .limit(10);
};

// services/productRequest.service.js

exports.getTrending = async () => {
  return ProductRequest.find({
    status: "pending"
  })
    .select("originalName voteCount createdAt")
    .sort({
      voteCount: -1,   // 🔥 most votes first
      createdAt: -1    // 🔥 newer gets priority if same votes
    })
    .limit(10);
};

// services/productRequest.service.js

exports.searchTrending = async (query) => {
  if (!query || query.length < 2) {
    return ProductRequest.find({ status: "pending" })
      .sort({ voteCount: -1 })
      .limit(10);
  }

  return ProductRequest.find({
    status: "pending",
    $or: [
      { originalName: { $regex: query, $options: "i" } },
      { productName: { $regex: query, $options: "i" } }
    ]
  })
    .sort({ voteCount: -1 })
    .limit(10);
};