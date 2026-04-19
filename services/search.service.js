// services/search.service.js

const Fuse = require("fuse.js");
const petpooja = require("../services/petpoojaService");
const ProductRequest = require("../models/ProductRequest");

const normalize = (str) =>
  str.toLowerCase().replace(/\s+/g, " ").trim();

/* ---------------- LEVENSHTEIN ---------------- */
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

/* ---------------- SCORE FUNCTION ---------------- */
const calculateScore = (query, text) => {
  query = normalize(query);
  text = normalize(text);

  if (!text) return 0;

  const qWords = query.split(" ");
  const tWords = text.split(" ");

  // ✅ Exact match
  if (text === query) return 1;

  // ✅ Prefix match (strong)
  if (text.startsWith(query)) {
    const extraLength = text.length - query.length;

    // penalize long names
    return 0.95 - Math.min(extraLength * 0.005, 0.15);
  }

  // ✅ Word match (all query words exist)
  const matchedWords = qWords.filter(q => tWords.includes(q)).length;
  const wordMatchRatio = matchedWords / qWords.length;

  if (wordMatchRatio === 1) {
    const distance = levenshtein(query, text);
    const maxLen = Math.max(query.length, text.length);

    return 0.8 + (1 - distance / maxLen) * 0.15;
  }

  // ✅ Partial match
  if (wordMatchRatio > 0) {
    return 0.5 + wordMatchRatio * 0.2;
  }

  // ✅ Fallback fuzzy
  const distance = levenshtein(query, text);
  const maxLen = Math.max(query.length, text.length);

  return 1 - distance / maxLen;
};

/* ---------------- MAIN SEARCH ---------------- */
exports.searchAll = async (query) => {
  if (!query || query.length < 2) return [];

  const normalizedQuery = normalize(query);

  /* 🔹 1. PETPOOJA */
  let petItems = [];
  try {
    const petpoojaRes = await petpooja.searchItems({ name: query });

    petItems = (petpoojaRes.data || []).map((item) => {
      const score = calculateScore(normalizedQuery, item.itemName);

      return {
        id: item.id,
        name: item.itemName,
        source: "petpooja",
        price: item.salesRate,
        score
      };
    });
  } catch (err) {
    console.error("Petpooja error:", err.message);
  }

  /* 🔹 2. LOCAL DB */
  const localItems = await ProductRequest.find({
    status: "pending"
  })
    .select("originalName productName voteCount")
    .limit(50);

  const fuse = new Fuse(localItems, {
    keys: ["productName", "originalName"],
    threshold: 0.4
  });

  const fuzzy = fuse.search(query).map((r) => {
    let score = 1 - r.score;

    // 🔥 vote boost
    score += (r.item.voteCount || 0) * 0.01;

    return {
      id: r.item._id,
      name: r.item.originalName,
      source: "local",
      votes: r.item.voteCount,
      score
    };
  });

  /* 🔥 MERGE + SORT */
  const combined = [...petItems, ...fuzzy];

  const sorted = combined
    .filter((i) => i.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6); // ✅ LIMIT TO 6

  return sorted;
};