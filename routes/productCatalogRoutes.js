// routes/productCatalogRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const { ok, fail } = require('../utils/responder');

/**
 * Get all products with filtering, sorting, and pagination
 */
const getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            brand,
            inStock,
            sortBy = 'name',
            sortOrder = 'asc',
            page = 1,
            limit = 20
        } = req.query;

        // Build filter
        const filter = { isActive: true };
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category && category !== 'All') {
            // Remove emoji from category for matching
            const cleanCategory = category.replace(/[^\w\s]/g, '').trim();
            filter.category = { $regex: cleanCategory, $options: 'i' };
        }
        
        if (minPrice || maxPrice) {
            filter.sellingPrice = {};
            if (minPrice) filter.sellingPrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.sellingPrice.$lte = parseFloat(maxPrice);
        }
        
        if (brand) {
            filter.brand = { $regex: brand, $options: 'i' };
        }
        
        if (inStock === 'true') {
            filter.currentStock = { $gt: 0 };
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .select('name brand sellingPrice costPrice currentStock category images description'),
            Product.countDocuments(filter)
        ]);

        // Get unique categories and brands for filters
        const [categories, brands] = await Promise.all([
            Product.distinct('category', { isActive: true }),
            Product.distinct('brand', { isActive: true, brand: { $ne: null, $ne: '' } })
        ]);

        return ok(res, {
            products: products.map(p => ({
                id: p._id,
                name: p.name,
                brand: p.brand,
                price: p.sellingPrice,
                originalPrice: p.costPrice,
                stock: p.currentStock,
                category: p.category,
                image: p.images?.[0] || null,
                description: p.description,
                inStock: p.currentStock > 0,
                lowStock: p.currentStock <= (p.minStockLevel || 10)
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNextPage: skip + products.length < total,
                hasPrevPage: page > 1
            },
            filters: {
                categories: ['All', ...categories.filter(c => c).map(c => `🍫 ${c}`)],
                brands: brands.filter(b => b),
                priceRange: {
                    min: 0,
                    max: 1000
                }
            }
        }, 'Products retrieved successfully');
    } catch (error) {
        console.error('Get products error:', error);
        return fail(res, error, 'Failed to get products');
    }
};

/**
 * Get product by ID
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.findById(id)
            .select('name brand sellingPrice costPrice currentStock category description images specifications');
        
        if (!product) {
            return fail(res, null, 'Product not found', 404);
        }
        
        // Get related products (same category)
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
        }).limit(4).select('name brand sellingPrice currentStock images');
        
        return ok(res, {
            product: {
                id: product._id,
                name: product.name,
                brand: product.brand,
                price: product.sellingPrice,
                originalPrice: product.costPrice,
                stock: product.currentStock,
                category: product.category,
                description: product.description,
                images: product.images || [],
                inStock: product.currentStock > 0,
                specifications: product.specifications || {}
            },
            relatedProducts: relatedProducts.map(p => ({
                id: p._id,
                name: p.name,
                brand: p.brand,
                price: p.sellingPrice,
                stock: p.currentStock,
                image: p.images?.[0]
            }))
        }, 'Product retrieved successfully');
    } catch (error) {
        console.error('Get product by ID error:', error);
        return fail(res, error, 'Failed to get product');
    }
};

/**
 * Get product suggestions for search
 */
const getProductSuggestions = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 2) {
            return ok(res, [], 'No suggestions');
        }
        
        const suggestions = await Product.find({
            name: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('name brand sellingPrice currentStock');
        
        return ok(res, suggestions.map(p => ({
            id: p._id,
            name: p.name,
            brand: p.brand,
            price: p.sellingPrice,
            inStock: p.currentStock > 0
        })), 'Suggestions retrieved');
    } catch (error) {
        console.error('Get suggestions error:', error);
        return ok(res, [], 'No suggestions available');
    }
};

/**
 * Get popular products
 */
const getPopularProducts = async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        
        const products = await Product.find({ isActive: true })
            .sort({ totalSold: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .select('name brand sellingPrice currentStock category images');
        
        return ok(res, products.map(p => ({
            id: p._id,
            name: p.name,
            brand: p.brand,
            price: p.sellingPrice,
            stock: p.currentStock,
            category: p.category,
            image: p.images?.[0]
        })), 'Popular products retrieved');
    } catch (error) {
        console.error('Get popular products error:', error);
        return fail(res, error, 'Failed to get popular products');
    }
};

/**
 * Get product statistics
 */
const getProductStats = async (req, res) => {
    try {
        const [totalProducts, totalStock, lowStock, categories, priceStats] = await Promise.all([
            Product.countDocuments({ isActive: true }),
            Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: '$currentStock' } } }]),
            Product.countDocuments({ currentStock: { $lte: '$minStockLevel' }, isActive: true }),
            Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
            Product.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: null, minPrice: { $min: '$sellingPrice' }, maxPrice: { $max: '$sellingPrice' }, avgPrice: { $avg: '$sellingPrice' } } }
            ])
        ]);
        
        return ok(res, {
            totalProducts,
            totalStock: totalStock[0]?.total || 0,
            lowStockProducts: lowStock,
            topCategories: categories,
            priceRange: {
                min: priceStats[0]?.minPrice || 0,
                max: priceStats[0]?.maxPrice || 1000,
                avg: Math.round(priceStats[0]?.avgPrice || 0)
            }
        }, 'Product statistics retrieved');
    } catch (error) {
        console.error('Get product stats error:', error);
        return fail(res, error, 'Failed to get product statistics');
    }
};

router.get('/', getProducts);
router.get('/suggestions', getProductSuggestions);
router.get('/popular', getPopularProducts);
router.get('/stats', getProductStats);
router.get('/:id', getProductById);

module.exports = router;