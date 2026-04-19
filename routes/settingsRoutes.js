// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');

const auth = require('../middleware/auth');

// Main settings routes
router.get('/',auth,settingsController.getSettings);
router.post('/reset',auth, settingsController.resetSettings);
router.get('/history',auth, settingsController.getSettingsHistory);

// Store status routes
router.get('/store-status', settingsController.getStoreStatus);
router.put('/store-status',auth, settingsController.updateStoreStatus);

// Section-specific update routes
router.put('/general',auth, settingsController.updateGeneralSettings);
router.put('/notifications',auth, settingsController.updateNotificationSettings);
router.put('/security', auth,settingsController.updateSecuritySettings);
router.put('/display',auth, settingsController.updateDisplaySettings);
router.put('/print',auth, settingsController.updatePrintSettings);
router.put('/invoice',auth, settingsController.updateInvoiceSettings);
router.put('/integrations', auth,settingsController.updateIntegrationSettings);

module.exports = router;