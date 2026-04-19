// services/searchService.js
const Fuse = require('fuse.js');
const ProductRequest = require('../models/ProductRequest');

class SearchService {
  constructor() {
    // Fuse.js configuration for fuzzy search
    this.fuseOptions = {
      includeScore: true,
      threshold: 0.4,
      distance: 100,
      keys: [
        { name: 'productName', weight: 0.7 },
        { name: 'originalName', weight: 0.5 },
        { name: 'category', weight: 0.3 },
        { name: 'brand', weight: 0.4 }
      ]
    };
  }

  // Calculate match score between search term and product name
  calculateMatchScore(searchTerm, productName) {
    const term = searchTerm.toLowerCase().trim();
    const name = productName.toLowerCase().trim();
    
    // Exact match
    if (name === term) return 100;
    
    // Exact match after removing spaces/special chars
    const normalizedTerm = term.replace(/[^a-z0-9]/g, '');
    const normalizedName = name.replace(/[^a-z0-9]/g, '');
    if (normalizedName === normalizedTerm) return 95;
    
    // Starts with match
    if (name.startsWith(term)) return 90;
    
    // Contains match
    if (name.includes(term)) {
      const score = 80 - (name.indexOf(term) * 0.5);
      return Math.max(60, score);
    }
    
    // Word by word matching
    const termWords = term.split(/\s+/);
    const nameWords = name.split(/\s+/);
    let matchedWords = 0;
    
    for (const termWord of termWords) {
      if (nameWords.some(nameWord => nameWord.includes(termWord) || termWord.includes(nameWord))) {
        matchedWords++;
      }
    }
    
    const wordMatchScore = (matchedWords / termWords.length) * 70;
    
    // Fuzzy match using Levenshtein distance
    const fuzzyScore = this.levenshteinScore(term, name);
    
    return Math.max(wordMatchScore, fuzzyScore);
  }
  
  // Calculate similarity score using Levenshtein distance
  levenshteinScore(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }
    
    const distance = track[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;
    
    return similarity;
  }
  
  // Search in Petpooja items (from your existing service)
  async searchPetpoojaItems(searchTerm) {
    try {
      const petpooja = require('./petpoojaService');
      const result = await petpooja.searchItems({ name: searchTerm });
      
      if (result && result.data) {
        return result.data.map(item => ({
          id: item.id,
          name: item.itemName,
          source: 'petpooja',
          matchScore: this.calculateMatchScore(searchTerm, item.itemName)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error searching Petpooja:', error);
      return [];
    }
  }
  
  // Search in product requests
  async searchProductRequests(searchTerm) {
    const requests = await ProductRequest.find({
      status: { $ne: 'rejected' }
    }).sort({ voteCount: -1 });
    
    const results = requests.map(request => ({
      id: request._id,
      name: request.originalName,
      source: 'request',
      voteCount: request.voteCount,
      status: request.status,
      matchScore: this.calculateMatchScore(searchTerm, request.originalName),
      productName: request.productName
    }));
    
    // Filter and sort by match score
    return results
      .filter(r => r.matchScore > 30)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
  
  // Combined search with fuzzy fallback
  async smartSearch(searchTerm, options = {}) {
    const {
      minScore = 30,
      includePetpooja = true,
      includeRequests = true
    } = options;
    
    let petpoojaResults = [];
    let requestResults = [];
    let fuzzyResults = [];
    
    // Search in Petpooja
    if (includePetpooja) {
      petpoojaResults = await this.searchPetpoojaItems(searchTerm);
      petpoojaResults = petpoojaResults.filter(r => r.matchScore >= minScore);
    }
    
    // Search in product requests
    if (includeRequests) {
      requestResults = await this.searchProductRequests(searchTerm);
      requestResults = requestResults.filter(r => r.matchScore >= minScore);
    }
    
    // If no results found with exact/contains, do fuzzy search
    const hasExactMatches = [...petpoojaResults, ...requestResults].some(
      r => r.matchScore > 70
    );
    
    if (!hasExactMatches && searchTerm.length > 2) {
      // Perform fuzzy search on all existing product requests
      const allRequests = await ProductRequest.find({
        status: { $ne: 'rejected' }
      });
      
      const fuse = new Fuse(allRequests, this.fuseOptions);
      fuzzyResults = fuse.search(searchTerm).map(result => ({
        id: result.item._id,
        name: result.item.originalName,
        source: 'request',
        voteCount: result.item.voteCount,
        matchScore: (1 - result.score) * 100,
        isFuzzyMatch: true
      }));
      
      // Add fuzzy results if they meet threshold
      fuzzyResults = fuzzyResults.filter(r => r.matchScore >= 50);
    }
    
    // Combine and sort all results
    const allResults = [
      ...petpoojaResults.map(r => ({ ...r, type: 'petpooja' })),
      ...requestResults.map(r => ({ ...r, type: 'request' })),
      ...fuzzyResults.map(r => ({ ...r, type: 'fuzzy' }))
    ];
    
    return allResults.sort((a, b) => b.matchScore - a.matchScore);
  }
}

module.exports = new SearchService();