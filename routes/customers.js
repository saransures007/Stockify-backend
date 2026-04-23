const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getMyProfile,
} = require("../controllers/customerController");

const {auth,authcustomerMiddleware} = require("../middleware/auth");
/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete a customer
 * @access  Private
 */
router.get("/me",authcustomerMiddleware, getMyProfile);



/**
 * @route   GET /api/customers/search
 * @desc    Search customers by name or phone
 * @access  Private
 */
router.get("/search",auth, searchCustomers);

/**
 * @route   GET /api/customers
 * @desc    Get all customers with pagination
 * @access  Private
 */
router.get("/", auth, getCustomers);

/**
 * @route   GET /api/customers/:id
 * @desc    Get a single customer by ID
 * @access  Private
 */
router.get("/:id", auth, getCustomer);

/**
 * @route   POST /api/customers
 * @desc    Create a new customer
 * @access  Private
 */
router.post("/", auth, createCustomer);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update a customer
 * @access  Private
 */
router.put("/:id", auth, updateCustomer);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete a customer
 * @access  Private
 */
router.delete("/:id", auth, deleteCustomer);




module.exports = router;
