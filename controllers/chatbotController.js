// controllers/chatbotController.js
const chatbotService = require('../services/aiChatbotService');
const Product = require('../models/Product');
const { ok, fail } = require('../utils/responder');

/**
 * Process chat message
 */
const processMessage = async (req, res) => {
    try {
        const { message, context = {} } = req.body;
        
        if (!message || message.trim().length === 0) {
            return fail(res, null, 'Message is required');
        }
        
        // Get store context
        const totalProducts = await Product.countDocuments({ isActive: true });
        const popularCategories = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        const enhancedContext = {
            ...context,
            totalProducts,
            popularCategories: popularCategories.map(c => c._id)
        };
        
        const response = await chatbotService.processMessage(message, enhancedContext);
        
        return ok(res, { response }, 'Message processed successfully');
    } catch (error) {
        console.error('Chatbot error:', error);
        return fail(res, error, 'Failed to process message');
    }
};

/**
 * Get product details
 */
const getProductDetails = async (req, res) => {
    try {
        const { productName } = req.query;
        
        if (!productName) {
            return fail(res, null, 'Product name required');
        }
        
        const productDetails = await chatbotService.getProductDescription(productName);
        
        return ok(res, productDetails, 'Product details retrieved');
    } catch (error) {
        console.error('Get product details error:', error);
        return fail(res, error, 'Failed to get product details');
    }
};

module.exports = { processMessage, getProductDetails };