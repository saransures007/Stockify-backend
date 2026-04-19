// controllers/productImportController.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const productConverter = require("../utils/productConverter");
const { ok, fail } = require("../utils/responder");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

class ProductImportController {
  /**
   * Import products from Petpooja CSV file
   */
  async importFromCSV(req, res) {
    try {
      if (!req.file) {
        return fail(res, null, "No file uploaded");
      }

      // Parse CSV file
      const results = [];
      const filePath = req.file.path;
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      if (results.length === 0) {
        return fail(res, null, "No data found in CSV file");
      }

      console.log(`📊 Processing ${results.length} products from CSV`);

      // Convert to product schema
      const { products, duplicates } = productConverter.convertToProductSchema(results, req.user);
      
      // Validate all products
      const validationResults = [];
      const validProducts = [];
      const invalidProducts = [];
      
      for (const product of products) {
        const validation = productConverter.validateProduct(product);
        if (validation.isValid) {
          validProducts.push(product);
        } else {
          invalidProducts.push({
            name: product.name,
            sku: product.sku,
            errors: validation.errors
          });
        }
      }
      
      if (validProducts.length === 0) {
        return fail(res, null, "No valid products to import");
      }
      
      // Check for existing products by SKU to avoid duplicates
      const existingSkus = await Product.find({
        sku: { $in: validProducts.map(p => p.sku) },
        createdBy: req.user._id
      }).select("sku");
      
      const existingSkuSet = new Set(existingSkus.map(p => p.sku));
      const newProducts = validProducts.filter(p => !existingSkuSet.has(p.sku));
      
      if (newProducts.length === 0) {
        return fail(res, null, "All products already exist in the database");
      }
      
      // Insert new products
      const insertedProducts = await Product.insertMany(newProducts);
      
      // Generate summary
      const summary = productConverter.generateImportSummary(
        newProducts,
        duplicates,
        invalidProducts
      );
      
      // Clean up temp file
      fs.unlinkSync(filePath);
      
      return ok(res, {
        importedCount: insertedProducts.length,
        summary,
        sampleProducts: insertedProducts.slice(0, 5).map(p => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          sellingPrice: p.sellingPrice
        }))
      }, `Successfully imported ${insertedProducts.length} products`);
      
    } catch (error) {
      console.error("Error importing products:", error);
      // Clean up temp file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, error, "Failed to import products");
    }
  }

  /**
   * Import products via direct JSON data (for API integration)
   */
  async importFromJSON(req, res) {
    try {
      const { products: productData } = req.body;
      
      if (!productData || !Array.isArray(productData) || productData.length === 0) {
        return fail(res, null, "Invalid or empty product data");
      }
      
      // Convert to product schema
      const { products, duplicates } = productConverter.convertToProductSchema(productData, req.user);
      
      // Validate
      const validProducts = [];
      const invalidProducts = [];
      
      for (const product of products) {
        const validation = productConverter.validateProduct(product);
        if (validation.isValid) {
          validProducts.push(product);
        } else {
          invalidProducts.push({
            name: product.name,
            sku: product.sku,
            errors: validation.errors
          });
        }
      }
      
      // Check existing products
      const existingSkus = await Product.find({
        sku: { $in: validProducts.map(p => p.sku) },
        createdBy: req.user._id
      }).select("sku");
      
      const existingSkuSet = new Set(existingSkus.map(p => p.sku));
      const newProducts = validProducts.filter(p => !existingSkuSet.has(p.sku));
      
      // Insert
      const insertedProducts = await Product.insertMany(newProducts);
      
      return ok(res, {
        imported: insertedProducts.length,
        skipped: products.length - insertedProducts.length,
        invalid: invalidProducts.length
      }, "Products imported successfully");
      
    } catch (error) {
      console.error("Error importing products from JSON:", error);
      return fail(res, error, "Failed to import products");
    }
  }

  /**
   * Preview import (show what would be imported)
   */
  async previewImport(req, res) {
    try {
      if (!req.file) {
        return fail(res, null, "No file uploaded");
      }
      
      // Parse CSV
      const results = [];
      const filePath = req.file.path;
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("end", resolve)
          .on("error", reject);
      });
      
      // Convert for preview
      const { products } = productConverter.convertToProductSchema(results, req.user);
      
      // Check existing products
      const existingSkus = await Product.find({
        sku: { $in: products.map(p => p.sku) },
        createdBy: req.user._id
      }).select("sku");
      
      const existingSkuSet = new Set(existingSkus.map(p => p.sku));
      
      const previewProducts = products.slice(0, 10).map(p => ({
        name: p.name,
        sku: p.sku,
        category: p.category,
        brand: p.brand,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        willBeImported: !existingSkuSet.has(p.sku),
        validation: productConverter.validateProduct(p)
      }));
      
      // Clean up
      fs.unlinkSync(filePath);
      
      return ok(res, {
        totalInFile: results.length,
        newProducts: products.filter(p => !existingSkuSet.has(p.sku)).length,
        existingProducts: products.filter(p => existingSkuSet.has(p.sku)).length,
        preview: previewProducts
      }, "Import preview generated");
      
    } catch (error) {
      console.error("Error previewing import:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, error, "Failed to preview import");
    }
  }
}

module.exports = new ProductImportController();