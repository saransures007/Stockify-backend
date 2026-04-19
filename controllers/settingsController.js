// controllers/settingsController.js
const Settings = require('../models/Settings');
const { ok, fail } = require('../utils/responder');
const settingsService = require("../services/settingsService.js");
/**
 * Get settings for current user
 */
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ createdBy: req.user._id });
        
        if (!settings) {
            // Create default settings if none exist
            settings = await Settings.create({
                createdBy: req.user._id,
                general: {
                    companyName: req.user.companyName || 'Stockify Store',
                    businessType: 'Retail',
                    currency: 'USD',
                    timezone: 'UTC+0',
                    language: 'English',
                    dateFormat: 'MM/DD/YYYY',
                    numberFormat: '1,234.56'
                },
                storeStatus: {
                    isOpen: true,
                    openingTime: '09:00',
                    closingTime: '21:00',
                    holidayMode: false,
                    temporaryCloseReason: '',
                    statusHistory: []
                },
                notifications: {
                    emailNotifications: true,
                    pushNotifications: true,
                    smsNotifications: false,
                    lowStockAlerts: true,
                    salesNotifications: true,
                    systemUpdates: false,
                    marketingEmails: false,
                    emailRecipients: [req.user.email],
                    smsNumbers: []
                },
                security: {
                    twoFactorAuth: false,
                    sessionTimeout: 30,
                    passwordExpiry: 90,
                    allowMultipleSessions: true,
                    ipRestriction: false,
                    allowedIPs: []
                },
                display: {
                    theme: 'light',
                    compactMode: false,
                    showAnimations: true,
                    highContrast: false,
                    fontSize: 'medium'
                },
                print: {
                    defaultPrinter: '',
                    receiptSize: '80mm',
                    copies: 1,
                    headerText: 'Thank you for shopping!',
                    footerText: 'Visit us again!',
                    showLogo: true,
                    showTaxDetails: true
                },
                invoice: {
                    prefix: 'INV',
                    startingNumber: 1001,
                    terms: 'Payment due within 15 days',
                    notes: ''
                },
                integrations: {
                    paymentGateway: { enabled: false, provider: '', apiKey: '', secretKey: '' },
                    smsGateway: { enabled: false, provider: '', apiKey: '' },
                    emailService: { enabled: false, provider: '', smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '' }
                }
            });
        }
        
        return ok(res, settings, 'Settings retrieved successfully');
    } catch (error) {
        console.error('Get settings error:', error);
        return fail(res, error, 'Failed to retrieve settings');
    }
};

/**
 * Update general settings
 */
const updateGeneralSettings = async (req, res) => {
    try {
        const { companyName, businessType, currency, timezone, language, dateFormat, numberFormat } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'general.companyName': companyName,
                    'general.businessType': businessType,
                    'general.currency': currency,
                    'general.timezone': timezone,
                    'general.language': language,
                    'general.dateFormat': dateFormat,
                    'general.numberFormat': numberFormat,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings, 'General settings updated successfully');
    } catch (error) {
        console.error('Update general settings error:', error);
        return fail(res, error, 'Failed to update general settings');
    }
};

/**
 * Update store status (open/close)
 */
const updateStoreStatus = async (req, res) => {
    try {
        const { isOpen, reason } = req.body;
        
        const settings = await Settings.findOne({ createdBy: req.user._id });
        
        if (!settings) {
            return fail(res, null, 'Settings not found');
        }
        
        // Add to history
        const historyEntry = {
            status: isOpen,
            reason: reason || (isOpen ? 'Store opened' : 'Store closed'),
            changedAt: new Date(),
            changedBy: req.user._id
        };
        
        settings.storeStatus.statusHistory.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (settings.storeStatus.statusHistory.length > 50) {
            settings.storeStatus.statusHistory = settings.storeStatus.statusHistory.slice(0, 50);
        }
        
        settings.storeStatus.isOpen = isOpen;
        settings.storeStatus.lastStatusChange = new Date();
        settings.storeStatus.temporaryCloseReason = isOpen ? '' : (reason || '');
        settings.updatedBy = req.user._id;
        
        await settings.save();
        
        // Emit socket event for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.emit('storeStatusChanged', {
                isOpen,
                reason: reason || (isOpen ? 'Store opened' : 'Store closed'),
                changedAt: new Date(),
                changedBy: req.user.name
            });
        }
        
        return ok(res, settings.storeStatus, 'Store status updated successfully');
    } catch (error) {
        console.error('Update store status error:', error);
        return fail(res, error, 'Failed to update store status');
    }
};

/**
 * Get store status
 */
const getStoreStatus = async (req, res) => {
  try {
    const data = await settingsService.getStoreStatus();

    return res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get store status"
    });
  }
};


/**
 * Update notification settings
 */
const updateNotificationSettings = async (req, res) => {
    try {
        const { emailNotifications, pushNotifications, smsNotifications, lowStockAlerts, salesNotifications, systemUpdates, marketingEmails, emailRecipients, smsNumbers } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'notifications.emailNotifications': emailNotifications,
                    'notifications.pushNotifications': pushNotifications,
                    'notifications.smsNotifications': smsNotifications,
                    'notifications.lowStockAlerts': lowStockAlerts,
                    'notifications.salesNotifications': salesNotifications,
                    'notifications.systemUpdates': systemUpdates,
                    'notifications.marketingEmails': marketingEmails,
                    'notifications.emailRecipients': emailRecipients,
                    'notifications.smsNumbers': smsNumbers,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.notifications, 'Notification settings updated successfully');
    } catch (error) {
        console.error('Update notification settings error:', error);
        return fail(res, error, 'Failed to update notification settings');
    }
};

/**
 * Update security settings
 */
const updateSecuritySettings = async (req, res) => {
    try {
        const { twoFactorAuth, sessionTimeout, passwordExpiry, allowMultipleSessions, ipRestriction, allowedIPs } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'security.twoFactorAuth': twoFactorAuth,
                    'security.sessionTimeout': sessionTimeout,
                    'security.passwordExpiry': passwordExpiry,
                    'security.allowMultipleSessions': allowMultipleSessions,
                    'security.ipRestriction': ipRestriction,
                    'security.allowedIPs': allowedIPs,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.security, 'Security settings updated successfully');
    } catch (error) {
        console.error('Update security settings error:', error);
        return fail(res, error, 'Failed to update security settings');
    }
};

/**
 * Update display settings
 */
const updateDisplaySettings = async (req, res) => {
    try {
        const { theme, compactMode, showAnimations, highContrast, fontSize } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'display.theme': theme,
                    'display.compactMode': compactMode,
                    'display.showAnimations': showAnimations,
                    'display.highContrast': highContrast,
                    'display.fontSize': fontSize,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.display, 'Display settings updated successfully');
    } catch (error) {
        console.error('Update display settings error:', error);
        return fail(res, error, 'Failed to update display settings');
    }
};

/**
 * Update print settings
 */
const updatePrintSettings = async (req, res) => {
    try {
        const { defaultPrinter, receiptSize, copies, headerText, footerText, showLogo, showTaxDetails } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'print.defaultPrinter': defaultPrinter,
                    'print.receiptSize': receiptSize,
                    'print.copies': copies,
                    'print.headerText': headerText,
                    'print.footerText': footerText,
                    'print.showLogo': showLogo,
                    'print.showTaxDetails': showTaxDetails,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.print, 'Print settings updated successfully');
    } catch (error) {
        console.error('Update print settings error:', error);
        return fail(res, error, 'Failed to update print settings');
    }
};

/**
 * Update invoice settings
 */
const updateInvoiceSettings = async (req, res) => {
    try {
        const { prefix, startingNumber, terms, notes } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'invoice.prefix': prefix,
                    'invoice.startingNumber': startingNumber,
                    'invoice.terms': terms,
                    'invoice.notes': notes,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.invoice, 'Invoice settings updated successfully');
    } catch (error) {
        console.error('Update invoice settings error:', error);
        return fail(res, error, 'Failed to update invoice settings');
    }
};

/**
 * Update integration settings
 */
const updateIntegrationSettings = async (req, res) => {
    try {
        const { paymentGateway, smsGateway, emailService } = req.body;
        
        const settings = await Settings.findOneAndUpdate(
            { createdBy: req.user._id },
            {
                $set: {
                    'integrations.paymentGateway': paymentGateway,
                    'integrations.smsGateway': smsGateway,
                    'integrations.emailService': emailService,
                    updatedBy: req.user._id
                }
            },
            { new: true, upsert: true }
        );
        
        return ok(res, settings.integrations, 'Integration settings updated successfully');
    } catch (error) {
        console.error('Update integration settings error:', error);
        return fail(res, error, 'Failed to update integration settings');
    }
};

/**
 * Get settings history (status changes)
 */
const getSettingsHistory = async (req, res) => {
    try {
        const { type = 'store' } = req.query;
        
        const settings = await Settings.findOne({ createdBy: req.user._id })
            .select('storeStatus.statusHistory updatedAt createdAt');
        
        if (!settings) {
            return ok(res, [], 'No history found');
        }
        
        let history = [];
        if (type === 'store') {
            history = settings.storeStatus.statusHistory;
        }
        
        return ok(res, history, 'Settings history retrieved');
    } catch (error) {
        console.error('Get settings history error:', error);
        return fail(res, error, 'Failed to get settings history');
    }
};

/**
 * Reset settings to default
 */
const resetSettings = async (req, res) => {
    try {
        const { section } = req.body;
        
        const settings = await Settings.findOne({ createdBy: req.user._id });
        
        if (!settings) {
            return fail(res, null, 'Settings not found');
        }
        
        // Define default values for each section
        const defaults = {
            general: {
                companyName: req.user.companyName || 'Stockify Store',
                businessType: 'Retail',
                currency: 'USD',
                timezone: 'UTC+0',
                language: 'English',
                dateFormat: 'MM/DD/YYYY',
                numberFormat: '1,234.56'
            },
            notifications: {
                emailNotifications: true,
                pushNotifications: true,
                smsNotifications: false,
                lowStockAlerts: true,
                salesNotifications: true,
                systemUpdates: false,
                marketingEmails: false,
                emailRecipients: [req.user.email],
                smsNumbers: []
            },
            security: {
                twoFactorAuth: false,
                sessionTimeout: 30,
                passwordExpiry: 90,
                allowMultipleSessions: true,
                ipRestriction: false,
                allowedIPs: []
            },
            display: {
                theme: 'light',
                compactMode: false,
                showAnimations: true,
                highContrast: false,
                fontSize: 'medium'
            },
            print: {
                defaultPrinter: '',
                receiptSize: '80mm',
                copies: 1,
                headerText: 'Thank you for shopping!',
                footerText: 'Visit us again!',
                showLogo: true,
                showTaxDetails: true
            },
            invoice: {
                prefix: 'INV',
                startingNumber: 1001,
                terms: 'Payment due within 15 days',
                notes: ''
            }
        };
        
        if (section && defaults[section]) {
            // Reset specific section
            settings[section] = defaults[section];
        } else if (section === 'storeStatus') {
            settings.storeStatus = {
                isOpen: true,
                openingTime: '09:00',
                closingTime: '21:00',
                holidayMode: false,
                temporaryCloseReason: '',
                lastStatusChange: new Date(),
                statusHistory: []
            };
        } else {
            // Reset all settings
            settings.general = defaults.general;
            settings.notifications = defaults.notifications;
            settings.security = defaults.security;
            settings.display = defaults.display;
            settings.print = defaults.print;
            settings.invoice = defaults.invoice;
            settings.storeStatus = {
                isOpen: true,
                openingTime: '09:00',
                closingTime: '21:00',
                holidayMode: false,
                temporaryCloseReason: '',
                lastStatusChange: new Date(),
                statusHistory: []
            };
            settings.integrations = {
                paymentGateway: { enabled: false, provider: '', apiKey: '', secretKey: '' },
                smsGateway: { enabled: false, provider: '', apiKey: '' },
                emailService: { enabled: false, provider: '', smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '' }
            };
        }
        
        settings.updatedBy = req.user._id;
        await settings.save();
        
        return ok(res, settings, 'Settings reset successfully');
    } catch (error) {
        console.error('Reset settings error:', error);
        return fail(res, error, 'Failed to reset settings');
    }
};

module.exports = {
    getSettings,
    updateGeneralSettings,
    updateStoreStatus,
    getStoreStatus,
    updateNotificationSettings,
    updateSecuritySettings,
    updateDisplaySettings,
    updatePrintSettings,
    updateInvoiceSettings,
    updateIntegrationSettings,
    getSettingsHistory,
    resetSettings
};