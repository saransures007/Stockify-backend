// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// Specific limiter for voting endpoints
const voteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // Limit each IP to 5 votes per minute
    message: {
        success: false,
        message: 'Too many votes from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP + device fingerprint for better accuracy
        const deviceId = req.headers['x-device-fingerprint'] || 
                        req.ip || 
                        req.connection.remoteAddress;
        return deviceId;
    }
});

// Stricter limiter for anonymous users
const anonymousVoteLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    max: 3, // Limit anonymous users to 3 votes per 5 minutes
    message: {
        success: false,
        message: 'Please login or wait before voting again.'
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    }
});

module.exports = { voteLimiter, anonymousVoteLimiter };