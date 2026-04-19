// routes/csvImportRoutes.js
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const csvImportController = require('../controllers/csvImportController');

const router = express.Router();

// Configure multer for CSV files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});



// CSV import routes
router.post('/upload',auth, upload.single('csvFile'), csvImportController.uploadCSV);
router.get('/template', auth,csvImportController.getCSVTemplate);
router.get('/template/download',auth, csvImportController.downloadCSVTemplate);
router.get('/history', auth,csvImportController.getImportHistory);

module.exports = router;