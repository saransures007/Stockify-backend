// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // General Settings
    general: {
        companyName: { type: String, default: 'Stockify Store' },
        businessType: { type: String, default: 'Retail', enum: ['Retail', 'Wholesale', 'Manufacturing', 'E-commerce', 'Restaurant', 'Other'] },
        currency: { type: String, default: 'USD' },
        timezone: { type: String, default: 'UTC+0' },
        language: { type: String, default: 'English' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        numberFormat: { type: String, default: '1,234.56' }
    },
    
    // Store Status
    storeStatus: {
        isOpen: { type: Boolean, default: true },
        openingTime: { type: String, default: '09:00' },
        closingTime: { type: String, default: '21:00' },
        holidayMode: { type: Boolean, default: false },
        temporaryCloseReason: { type: String, default: '' },
        lastStatusChange: { type: Date, default: Date.now },
        statusHistory: [{
            status: { type: Boolean, required: true },
            reason: { type: String },
            changedAt: { type: Date, default: Date.now },
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }]
    },
    
    // Notification Settings
    notifications: {
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        lowStockAlerts: { type: Boolean, default: true },
        salesNotifications: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false },
        emailRecipients: [{ type: String }],
        smsNumbers: [{ type: String }]
    },
    
    // Security Settings
    security: {
        twoFactorAuth: { type: Boolean, default: false },
        sessionTimeout: { type: Number, default: 30 },
        passwordExpiry: { type: Number, default: 90 },
        allowMultipleSessions: { type: Boolean, default: true },
        ipRestriction: { type: Boolean, default: false },
        allowedIPs: [{ type: String }]
    },
    
    // Display Settings
    display: {
        theme: { type: String, default: 'light', enum: ['light', 'dark', 'system'] },
        compactMode: { type: Boolean, default: false },
        showAnimations: { type: Boolean, default: true },
        highContrast: { type: Boolean, default: false },
        fontSize: { type: String, default: 'medium', enum: ['small', 'medium', 'large', 'extra-large'] }
    },
    
    // Print Settings
    print: {
        defaultPrinter: { type: String, default: '' },
        receiptSize: { type: String, default: '80mm', enum: ['58mm', '80mm', 'A4'] },
        copies: { type: Number, default: 1 },
        headerText: { type: String, default: 'Thank you for shopping!' },
        footerText: { type: String, default: 'Visit us again!' },
        showLogo: { type: Boolean, default: true },
        showTaxDetails: { type: Boolean, default: true }
    },
    
    // Invoice Settings
    invoice: {
        prefix: { type: String, default: 'INV' },
        startingNumber: { type: Number, default: 1001 },
        terms: { type: String, default: 'Payment due within 15 days' },
        notes: { type: String, default: '' }
    },
    
    // Integration Settings
    integrations: {
        paymentGateway: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, default: '' },
            apiKey: { type: String, default: '' },
            secretKey: { type: String, default: '' }
        },
        smsGateway: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, default: '' },
            apiKey: { type: String, default: '' }
        },
        emailService: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, default: '' },
            smtpHost: { type: String, default: '' },
            smtpPort: { type: Number, default: 587 },
            smtpUser: { type: String, default: '' },
            smtpPass: { type: String, default: '' }
        }
    },
    
    // User reference
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// Index for efficient queries
settingsSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Settings', settingsSchema);