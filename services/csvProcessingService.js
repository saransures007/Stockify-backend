// services/csvProcessingService.js
const csv = require('csv-parser');
const { Readable } = require('stream');
const mongoose = require('mongoose');

class CSVProcessingService {
    constructor() {
        // Map CSV columns to product schema fields
        this.fieldMappings = {
            // CSV Column Name: Product Schema Field
            'Item Name': 'name',
            'Item ID': 'originalId',
            'Item Type': 'type',
            'Unit': 'unit',
            'Barcode': 'barcode',
            'MRP': 'mrp',
            'Sales Rate': 'sellingPrice',
            'Wholesale Rate': 'wholesalePrice',
            'Purchase Rate': 'purchasePrice',
            'Avg Landing Cost': 'costPrice',
            'Opening Stock': 'currentStock',
            'Available Stock': 'availableStock',
            'Minimum Stock': 'minStockLevel',
            'Par Stock': 'parStock',
            'Description': 'description',
            'Group Name': 'category',
            'Category Name': 'subCategory',
            'Brand Name': 'brand',
            'HSN/SAC': 'hsnCode',
            'GST Type': 'gstType',
            'Inter GST Tax Rate': 'interGstRate',
            'Intra GST Tax Rate': 'intraGstRate'
        };

        // Required fields for validation
        this.requiredFields = ['Item Name', 'Sales Rate', 'Purchase Rate'];
    }

    /**
     * Parse CSV buffer and extract products
     */
    // services/csvProcessingService.js - Add debug logs
async parseCSV(buffer, userId, options = {}) {
    const products = [];
    const errors = [];
    const duplicates = [];
    let rowNumber = 0;

    console.log('📊 Starting CSV parse, buffer size:', buffer.length);
    
    return new Promise((resolve, reject) => {
        const bufferString = buffer.toString();
        console.log('📝 First 500 chars of CSV:', bufferString.substring(0, 500));
        
        const stream = Readable.from(bufferString);
        const rows = [];
        
        let dataCount = 0;
        
        stream
            .pipe(csv({
                mapHeaders: ({ header }) => {
                    const normalized = this.normalizeHeader(header);
                    console.log('📋 CSV Header:', header, '->', normalized);
                    return normalized;
                },
                skipLines: options.skipLines || 0
            }))
            .on('data', (row) => {
                dataCount++;
                rowNumber++;
                console.log(`📊 Processing row ${rowNumber}, keys:`, Object.keys(row));
                rows.push({ row, rowNumber });
            })
            .on('end', async () => {
                console.log(`✅ CSV parsing complete. Total rows: ${dataCount}, rows in array: ${rows.length}`);
                
                try {
                    console.log('🔄 Starting to process rows sequentially...');
                    
                    for (const { row, rowNumber: currentRow } of rows) {
                        try {
                            // Validate required fields
                            const normalizedHeaders = {};
                            Object.keys(row).forEach(key => {
                                normalizedHeaders[key] = row[key];
                            });
                            
                            const missingFields = this.requiredFields.filter(
                                field => {
                                    const normalizedField = this.normalizeHeader(field);
                                    const value = row[normalizedField];
                                    return !value || value === '';
                                }
                            );
                            
                            if (missingFields.length > 0) {
                                errors.push({
                                    row: currentRow,
                                    errors: missingFields.map(f => `Missing ${f}`),
                                    data: row
                                });
                                console.log(`⚠️ Row ${currentRow} has missing fields:`, missingFields);
                                continue;
                            }

                            const product = await this.processRow(row, userId, currentRow);
                            console.log(`✅ Row ${currentRow} processed into product:`, product.name);
                          
                            if (product) {
                                const isDuplicate = await this.checkDuplicate(product, userId);
                              
                                if (isDuplicate && !options.overwrite) {
                                    duplicates.push({
                                        row: currentRow,
                                        product: product,
                                        reason: isDuplicate.reason
                                    });
                                    console.log(`🔄 Row ${currentRow} is duplicate:`, isDuplicate.reason);
                                } else {
                                    products.push(product);
                                    console.log(`✨ Row ${currentRow} added to products list. Total: ${products.length}`);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Error processing row ${currentRow}:`, error.message);
                            errors.push({
                                row: currentRow,
                                errors: [error.message],
                                data: row
                            });
                        }
                    }
                    
                    console.log(`🎉 Processing complete. Products: ${products.length}, Errors: ${errors.length}, Duplicates: ${duplicates.length}`);
                    
                    resolve({
                        products,
                        errors,
                        duplicates,
                        totalRows: rowNumber,
                        validProducts: products.length,
                        duplicateCount: duplicates.length,
                        errorCount: errors.length
                    });
                } catch (error) {
                    console.error('❌ Fatal error during row processing:', error);
                    reject(error);
                }
            })
            .on('error', (error) => {
                console.error('❌ CSV parsing error:', error);
                reject(error);
            });
    });
}

    /**
     * Process individual CSV row into product object
     */
    async processRow(row, userId, rowNumber) {
        const product = {
            createdBy: userId,
            isActive: true,
            importedFrom: 'csv',
            importDate: new Date()
        };

        // Map CSV fields to product schema
        for (const [csvField, schemaField] of Object.entries(this.fieldMappings)) {
            const normalizedField = this.normalizeHeader(csvField);
            //console.log(row);
            let value = row[normalizedField];
            
            if (value !== undefined && value !== null && value !== '') {
                // Handle special field conversions
                switch (schemaField) {
                    case 'currentStock':
                    case 'availableStock':
                    case 'minStockLevel':
                    case 'parStock':
                        value = this.parseNumber(value);
                        break;
                    case 'sellingPrice':
                    case 'wholesalePrice':
                    case 'purchasePrice':
                    case 'costPrice':
                        value = this.parsePrice(value);
                        break;
                    case 'name':
                        value = this.sanitizeString(value);
                        break;
                    default:
                        value = this.sanitizeString(value);
                }
                
                product[schemaField] = value;
            }
        }

        // Generate SKU if not present
        if (!product.sku || product.sku === '') {
            product.sku = this.generateSKU(product);
        }

        // Ensure numeric fields have valid values
        product.currentStock = product.currentStock || 0;
        product.minStockLevel = product.minStockLevel || 10;
        
        
        
        // Set cost price if missing but purchase price exists
        if (!product.costPrice && product.purchasePrice) {
            product.costPrice = product.purchasePrice;
        }

        // Ensure selling price is greater than cost price
        if (product.sellingPrice <= product.costPrice && product.costPrice > 0) {
            product.sellingPrice = product.costPrice * 1.3; // 30% markup
        }

        // Set category if missing
        if (!product.category) {
            product.category = '';
        }

        // Set brand if missing
        if (!product.brand) {
            product.brand = this.inferBrandFromName(product.name);
        }

        // Add metadata
        product.importMetadata = {
            rowNumber,
            importedAt: new Date(),
            originalData: row
        };

       // console.log(product);

        return product;
    }

    /**
     * Check for duplicate products
     */
    async checkDuplicate(product, userId) {
        const Product = mongoose.model('Product');
        
        // Check by barcode (most reliable)
        if (product.barcode) {
            const existingByBarcode = await Product.findOne({
                barcode: product.barcode,
                createdBy: userId,
                isActive: true
            });
            
            if (existingByBarcode) {
                return {
                    isDuplicate: true,
                    reason: `Barcode ${product.barcode} already exists`,
                    existingProduct: existingByBarcode
                };
            }
        }
        
        // Check by SKU (if exists)
        if (product.sku && product.sku !== this.generateSKU(product)) {
            const existingBySKU = await Product.findOne({
                sku: product.sku,
                createdBy: userId,
                isActive: true
            });
            
            if (existingBySKU) {
                return {
                    isDuplicate: true,
                    reason: `SKU ${product.sku} already exists`,
                    existingProduct: existingBySKU
                };
            }
        }
        
        // Check by name (fuzzy match for similar products)
        if (product.name) {
            const existingByName = await Product.findOne({
                name: { $regex: new RegExp(`^${product.name}$`, 'i') },
                createdBy: userId,
                isActive: true
            });
            
            if (existingByName) {
                return {
                    isDuplicate: true,
                    reason: `Product with name "${product.name}" already exists`,
                    existingProduct: existingByName
                };
            }
        }
        
        return false;
    }

    /**
     * Import products to database
     */
    async importProducts(products, userId, options = {}) {
        const Product = mongoose.model('Product');
        const Category = mongoose.model('Category');
        
        const results = {
            inserted: [],
            updated: [],
            failed: [],
            categories: new Set()
        };
        
        for (const product of products) {
            try {
                // Handle categories - create if not exists
                if (product.category) {
                    results.categories.add(product.category);
                    
                    // Ensure category exists in database
                    let category = await Category.findOne({
                        name: product.category,
                        createdBy: userId
                    });
                    
                    if (!category) {
                        category = await Category.create({
                            name: product.category,
                            description: `Auto-created from CSV import`,
                            createdBy: userId,
                            isActive: true
                        });
                    }
                }
                
                // Check if product exists for update
                const existingProduct = await this.findExistingProduct(product, userId);
                
                if (existingProduct && options.updateExisting) {
                    // Update existing product
                    const updated = await Product.findByIdAndUpdate(
                        existingProduct._id,
                        {
                            ...product,
                            updatedAt: new Date(),
                            lastImported: new Date()
                        },
                        { new: true, runValidators: true }
                    );
                    results.updated.push(updated);
                } else if (!existingProduct) {
                    // Insert new product
                    const inserted = await Product.create(product);
                    results.inserted.push(inserted);
                } else {
                    results.failed.push({
                        product,
                        reason: 'Duplicate and updateExisting is false'
                    });
                }
            } catch (error) {
                results.failed.push({
                    product,
                    reason: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Find existing product by various identifiers
     */
    async findExistingProduct(product, userId) {
        const Product = mongoose.model('Product');
        
        // Try to find by barcode
        if (product.barcode) {
            const existing = await Product.findOne({
                barcode: product.barcode,
                createdBy: userId,
                isActive: true
            });
            if (existing) return existing;
        }
        
        // Try by SKU
        if (product.sku) {
            const existing = await Product.findOne({
                sku: product.sku,
                createdBy: userId,
                isActive: true
            });
            if (existing) return existing;
        }
        
        // Try by name (exact match)
        if (product.name) {
            const existing = await Product.findOne({
                name: { $regex: new RegExp(`^${product.name}$`, 'i') },
                createdBy: userId,
                isActive: true
            });
            if (existing) return existing;
        }
        
        return null;
    }

    /**
     * Generate SKU from product data
     */
    generateSKU(product) {
        const categoryCode = product.category 
            ? product.category.substring(0, 3).toUpperCase() 
            : 'GEN';
        const nameCode = product.name 
            ? product.name.substring(0, 3).toUpperCase().replace(/\s/g, '') 
            : 'PRD';
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${categoryCode}-${nameCode}-${random}`;
    }

    /**
     * Infer brand from product name
     */
    inferBrandFromName(name) {
        if (!name) return '';
        
        const brandPatterns = [
            /^(GOODDAY|NICE TIME|CAPELLA|NIVEA|ENGAGE|DENVER|BELLAVITA|HONG THAI|FF|MILKYMIST|PEPSI|KINDLY|AQUAFINA|TOBLERONE|LINDT|HERSHEY|CADBURY|KITKAT|SNICKERS|MARS|ORBIT|BOUNTY|MOGU MOGU|MAZZA)/i,
            /^(BRITANNIA|BRIT|PARLE|SUNFEAST|HIDE & SEEK|BOURBON|GOOD DAY|TIGER)/i,
            /^(NESTLE|MAGGI|MILKYBAR|KITKAT|MUNCH)/i,
            /^(MILKY MIST|MM|CAPELLA|HUTSAN|ANIL|POPULAR|RELISH|GOLD WINNER)/i
        ];
        
        for (const pattern of brandPatterns) {
            const match = name.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        const firstWord = name.split(/\s+/)[0];
        if (/^[A-Z][A-Za-z]{2,}$/.test(firstWord) && firstWord.length <= 15) {
            return firstWord;
        }
        
        return '';
    }

    /**
     * Parse price from string
     */
    parsePrice(value) {
        if (typeof value === 'number') return Math.max(0, value);
        if (!value) return 0;
        
        const cleaned = value.toString()
            .replace(/[₹$£€¥,\s]/g, '')
            .trim();
        
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : Math.max(0, number);
    }

    /**
     * Parse number from string
     */
    parseNumber(value) {
        if (typeof value === 'number') return Math.max(0, value);
        if (!value) return 0;
        
        const cleaned = value.toString()
            .replace(/[,\s]/g, '')
            .trim();
        
        const number = parseInt(cleaned);
        return isNaN(number) ? 0 : Math.max(0, number);
    }

    /**
     * Sanitize string values
     */
    sanitizeString(value) {
        if (!value) return '';
        return value.toString()
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * Normalize CSV header
     */
    normalizeHeader(header) {
        if (!header) return '';
        return header.toString()
            .trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }
}

module.exports = new CSVProcessingService();