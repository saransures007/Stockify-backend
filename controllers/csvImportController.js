// controllers/csvImportController.js
const csvProcessingService = require('../services/csvProcessingService');
const Product = require('../models/Product');
const { ok, fail } = require('../utils/responder');
const fs = require('fs');
const path = require('path');

/**
 * Upload and process CSV file
 */
const uploadCSV = async (req, res) => {
    try {
        if (!req.file) {
            return fail(res, null, 'No CSV file uploaded');
        }

        const { 
            updateExisting = 'false', 
            skipDuplicates = 'true',
            preview = 'true'
        } = req.query;

        const options = {
            updateExisting: updateExisting === 'true',
            skipDuplicates: skipDuplicates === 'true',
            preview: preview === 'true',
            skipLines: 0
        };

        // Parse CSV file
        const parseResult = await csvProcessingService.parseCSV(
            req.file.buffer,
            req.user._id,
            options
        );

        console.log("parseResult",parseResult);
        // If preview mode, return preview data
        if (options.preview) {
            return ok(res, {
                preview: true,
                summary: {
                    totalRows: parseResult.totalRows,
                    validProducts: parseResult.validProducts,
                    duplicateCount: parseResult.duplicateCount,
                    errorCount: parseResult.errorCount
                },
                sampleProducts: parseResult.products.slice(0, 10),
                duplicates: parseResult.duplicates.slice(0, 20),
                errors: parseResult.errors.slice(0, 20),
                allProducts: parseResult.products
            }, 'CSV processed successfully - Preview mode');
        }

        // Import products
        const importResult = await csvProcessingService.importProducts(
            parseResult.products,
            req.user._id,
            options
        );

        return ok(res, {
            summary: {
                totalProcessed: parseResult.totalRows,
                inserted: importResult.inserted.length,
                updated: importResult.updated.length,
                failed: importResult.failed.length,
                duplicatesSkipped: parseResult.duplicateCount
            },
            insertedProducts: importResult.inserted.slice(0, 50),
            updatedProducts: importResult.updated.slice(0, 50),
            failedProducts: importResult.failed.slice(0, 50),
            errors: parseResult.errors.slice(0, 50)
        }, 'CSV import completed');
        
    } catch (error) {
        console.error('CSV Import Error:', error);
        return fail(res, error, 'Failed to process CSV file');
    }
};

/**
 * Get CSV import template
 */
const getCSVTemplate = async (req, res) => {
    try {
        const template = [
            {
                'Item Name': 'Sample Product',
                'Item ID': 'PROD001',
                'Item Type': 'goods',
                'Unit': 'UNITS',
                'Barcode': '8901234567890',
                'Gst Type': 'taxable',
                'MRP': '100.00',
                'Sales Rate': '90.00',
                'Purchase Rate': '75.00',
                'Avg Landing Cost': '75.00',
                'Opening Stock': '50',
                'Minimum Stock': '10',
                'Description': 'Sample product description',
                'Group Name': 'Electronics',
                'Category Name': 'Accessories',
                'Brand Name': 'Sample Brand',
                'HSN/SAC': '8517',
                'Inter GST Tax Rate': '18.00',
                'Intra GST Tax Rate': '9.00'
            }
        ];
        
        return ok(res, {
            template,
            requiredFields: ['Item Name', 'Sales Rate', 'Purchase Rate'],
            optionalFields: Object.keys(template[0])
        }, 'CSV template generated');
        
    } catch (error) {
        console.error('Template Generation Error:', error);
        return fail(res, error, 'Failed to generate CSV template');
    }
};

/**
 * Download CSV template as file
 */
const downloadCSVTemplate = async (req, res) => {
    try {
        const headers = [
            'Item Name', 'Item ID', 'Item Type', 'Unit', 'Barcode', 'Gst Type',
            'MRP', 'Sales Rate', 'Wholesale Rate', 'Purchase Rate', 'Avg Landing Cost',
            'Opening Stock', 'Minimum Stock', 'Par Stock', 'Description', 'Group Name',
            'Category Name', 'Brand Name', 'HSN/SAC', 'Inter GST Tax Rate', 'Intra GST Tax Rate'
        ];
        
        const sampleRow = [
            'Sample Product', 'PROD001', 'goods', 'UNITS', '8901234567890', 'taxable',
            '100.00', '90.00', '85.00', '75.00', '75.00',
            '50', '10', '20', 'Sample product description', 'Electronics',
            'Accessories', 'Sample Brand', '8517', '18.00', '9.00'
        ];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            sampleRow.map(cell => `"${cell}"`).join(',')
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
        res.send(csvContent);
        
    } catch (error) {
        console.error('Template Download Error:', error);
        return fail(res, error, 'Failed to download CSV template');
    }
};

/**
 * Get import history
 */
const getImportHistory = async (req, res) => {
    try {
        const history = await Product.aggregate([
            {
                $match: {
                    createdBy: req.user._id,
                    importedFrom: 'csv'
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$importDate" } }
                    },
                    count: { $sum: 1 },
                    products: {
                        $push: {
                            name: "$name",
                            sku: "$sku",
                            createdAt: "$createdAt"
                        }
                    }
                }
            },
            { $sort: { "_id.date": -1 } },
            { $limit: 20 }
        ]);
        
        return ok(res, history, 'Import history retrieved');
        
    } catch (error) {
        console.error('History Fetch Error:', error);
        return fail(res, error, 'Failed to fetch import history');
    }
};

module.exports = {
    uploadCSV,
    getCSVTemplate,
    downloadCSVTemplate,
    getImportHistory
};