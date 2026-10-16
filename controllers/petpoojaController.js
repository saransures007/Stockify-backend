const petpooja = require('../services/petpoojaService');
const { formatItem } = require('../utils/helpers');

// ============================================================
// SEARCH PETPOOJA ITEMS
// GET /api/petpooja/items/search?q=RB CHOCO
// ============================================================
const formatPetpoojaSearchItem = (item) => ({
  id: item.id,

  itemName:
    item.itemName || "",

  description:
    item.description || "",

  itemCode:
    item.itemCode || "",

  barcode:
    item.barcode || "",

  hsn:
    item.hsn || "",

  mrp:
    Number(item.mrp || 0),

  purchaseRate:
    Number(item.purchaseRate || 0),

  salesRate:
    Number(item.salesRate || 0),

  stock:
    Number(
      item.availableStockQty ??
      item.totalStock ??
      item.availableStock?.total ??
      0
    ),

  unit:
    item.unit || "",

  group:
    item.group?.name ||
    item.groupName ||
    "",

  category:
    item.category?.name ||
    item.categoryName ||
    "",

  brand:
    item.brand?.name ||
    item.brandName ||
    "",

  isActive:
    item.isActive !== false,
});

const searchPetpoojaItems = async (req, res) => {
  try {


    console.log("req.query:", req.query)
     const {
      page = 1,
      perPage = 100,
      categoryId,
      groupId,
      itemName,
      sort_by,
      sort_order,
      item_filter = 'all'
    } = req.query;

    if (!itemName.trim()) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        pagination: null,
      });
    }


        const result = await petpooja.getItems(
      parseInt(page),
      parseInt(perPage),
      {
        category_id: categoryId,
        group_id: groupId,
        item_name: itemName,
        sort_by,
        sort_order,
        item_filter,
        include_variants: true
      }
    );


    const items =
      Array.isArray(result?.data)
        ? result.data
        : [];

    const formatted =
      items.map(formatPetpoojaSearchItem);

    return res.json({
      success: true,

      count:
        formatted.length,

      data:
        formatted,

      pagination:
        result?.pagination || null,
    });

  } catch (error) {

    console.error(
      "[Petpooja Search] Error:",
      error?.response?.data ||
      error?.message
    );

    return res.status(
      error?.response?.status || 500
    ).json({
      success: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to search Petpooja products",

      data: [],

      pagination: null,
    });
  }
};



// ============================================================
// UPDATE STOCK ADJUSTMENT
// PUT /api/petpooja/stock-adjustments/:id
// ============================================================
const updateStockAdjustment =
  async (req, res) => {

    try {

      const {
        id
      } = req.params;

      const payload =
        req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Stock adjustment ID is required",
        });
      }

      if (!payload) {
        return res.status(400).json({
          success: false,
          message:
            "Request body is required",
        });
      }

      if (
        !Array.isArray(
          payload.lineItems
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "lineItems must be an array",
        });
      }

      console.log(
        "[Stock Adjustment] ID:",
        id
      );

      console.log(
        "[Stock Adjustment] Payload:",
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      const result =
        await petpooja.updateStockAdjustment(
          id,
          payload
        );

      return res.json({
        success: true,
        data: result,
      });

    } catch (error) {

      console.error(
        "[Stock Adjustment] Error:",
        error?.response?.data ||
          error?.message
      );

      return res.status(
        error?.response?.status ||
          500
      ).json({

        success: false,

        message:
          error?.response?.data
            ?.message ||
          error?.message ||
          "Failed to update stock",

        data:
          error?.response?.data ||
          null,
      });
    }
  };


// GET /api/petpooja/items
const getPetpoojaItems = async (req, res) => {
  try {
    const {
      page = 1,
      perPage = 100,
      categoryId,
      groupId,
      itemName,
      sort_by,
      sort_order,
      item_filter = 'all'
    } = req.query;

    console.log("test12345")

    const data = await petpooja.getItems(
      parseInt(page),
      parseInt(perPage),
      {
        category_id: categoryId,
        group_id: groupId,
        item_name: itemName,
        sort_by,
        sort_order,
        item_filter,
        include_variants: true
      }
    );

    // 🔥 FILTER + TRANSFORM
    const formatted = (data.data || []).map(formatItem);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
      pagination: data.pagination
    });

  } catch (error) {
    console.error('Petpooja API error:', error?.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message
    });
  }
};


// GET /api/petpooja/items/:id
const getPetpoojaItemById = async (req, res) => {
  try {

    console.log("getPetpoojaItemById1:",req.params.id);
   const item = await petpooja.getItemById(req.params.id);

    const data = item;
    console.log("getPetpoojaItemById:",item)
    let attributes = {};
    try {
      attributes = JSON.parse(data.variantAttributes || '{}');
    } catch (e) {}

    const formatted = {
      id: data?.id,
      itemName: data?.itemName,
      itemImage: data?.itemImage,
      salesRate: Number(data?.salesRate),
      mrp: Number(data?.mrp),
      Size: attributes?.Size || null,
      Flavor: attributes?.Flavor || null,
      category: data?.category?.name,
      group: data?.group?.name,
      isActive: data?.isActive,
      stock:data.stock?.total
    };

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Item fetch error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ============================================================
// CREATE PETPOOJA ITEM
// POST /api/petpooja/items
// ============================================================
const createPetpoojaItem = async (req, res) => {
  try {
    const payload = req.body;

    console.log(
      "[Create Petpooja Item] Request:",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Request body is required",
      });
    }

    // Required fields
    const requiredFields = [
      "itemType",
      "itemName",
      "itemCode",
      "unit",
      "purchaseRate",
      "salesRate",
      "categoryId",
      "groupId",
      "openingStockQty",
    ];

    const missingFields =
      requiredFields.filter(
        (field) =>
          payload[field] ===
            undefined ||
          payload[field] ===
            null ||
          payload[field] === ""
      );

    if (
      missingFields.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields are missing",
        missingFields,
      });
    }

    const result =
      await petpooja.createItem(
        payload
      );

    return res.status(201).json({
      success: true,
      message:
        "Petpooja item created successfully",
      data: result,
    });

  } catch (error) {
    console.error(
      "[Create Petpooja Item] Error:",
      error?.response?.data ||
        error?.message
    );

    return res.status(
      error?.response?.status ||
        500
    ).json({
      success: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create Petpooja item",

      data:
        error?.response?.data ||
        null,
    });
  }
};

// ✅ NEW: GET /api/petpooja/master-data
const getMasterData = async (req, res) => {
  try {
    const data = await petpooja.getMasterData();

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Master data error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ✅ NEW: Only active (IMPORTANT for UI)
const getActiveMasterData = async (req, res) => {
  try {
    const data = await petpooja.getMasterData();

    res.json({
      success: true,
      data: {
        groups: data.groups?.filter(g => g.isActive),
        categories: data.categories?.filter(c => c.isActive),
        locations: data.locations?.filter(l => l.isActive),
      }
    });

  } catch (error) {
    console.error('Active master data error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createStockAdjustment = async (req, res) => {
  try {
    const payload = req.body;

    if (
      !payload ||
      !Array.isArray(payload.lineItems) ||
      payload.lineItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one line item is required",
      });
    }

    // --------------------------------------------------------
    // 1. GET VOUCHER SERIES
    // --------------------------------------------------------

    const voucherInit =
      await petpooja.getStockAdjustmentVoucherInit();

    const series =
      voucherInit?.voucherAutoSeries?.find(
        item =>
          item.voucherType ===
          "stockAdjustment"
      );

    if (!series) {
      return res.status(500).json({
        success: false,
        message:
          "Stock adjustment voucher series not found",
      });
    }

    const voucherAutoSeriesId =
      Number(series.id);

    const nextNumber =
      Number(series.nextNumber);

    // --------------------------------------------------------
    // 2. BUILD PETPOOJA PAYLOAD
    // --------------------------------------------------------

    const stockPayload = {
      date:
        payload.date ||
        new Date()
          .toISOString()
          .slice(0, 10),

      isAutoNumber: true,

      voucherAutoSeriesId,

      notes:
        payload.notes ||
        "Stock Update By Stockify System",

      status:
        payload.status ||
        "approved",

      reasonId:
        Number(payload.reasonId),

      attachment:
        payload.attachment || "",

      lineItems:
        payload.lineItems.map(item => ({
          itemId:
            Number(item.itemId),

          batchId:
            item.batchId != null
              ? Number(item.batchId)
              : null,

          locationId:
            item.locationId != null
              ? Number(item.locationId)
              : null,

          existingQuantity:
            Number(
              item.existingQuantity
            ),

          newQuantityOnHand:
            Number(
              item.newQuantityOnHand
            ),

          adjustedQuantity:
            Number(
              item.adjustedQuantity
            ),

          unitId:
            item.unitId != null
              ? Number(item.unitId)
              : null,

          serialNumbers:
            Array.isArray(
              item.serialNumbers
            )
              ? item.serialNumbers
              : [],

          serialNumberIds:
            Array.isArray(
              item.serialNumberIds
            )
              ? item.serialNumberIds
              : [],
        })),
    };

    // --------------------------------------------------------
    // 3. CREATE STOCK ADJUSTMENT
    // --------------------------------------------------------

    const result =
      await petpooja.createStockAdjustment(
        stockPayload
      );

    return res.status(201).json({
      success: true,

      voucherNumber:
        nextNumber,

      voucherAutoSeriesId,

      data: result,
    });

  } catch (error) {

    console.error(
      "[Stock Adjustment Controller] Error:",
      error?.response?.data ||
      error?.message
    );

    return res.status(
      error?.response?.status ||
      500
    ).json({
      success: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create stock adjustment",

      data:
        error?.response?.data ||
        null,
    });
  }
};

// ============================================================
// GET /api/petpooja/suppliers
// ============================================================
const getPetpoojaSuppliers = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      perPage = 100,
    } = req.query;

    const result =
      await petpooja.getSuppliers(
        Number(page),
        Number(perPage)
      );

    const suppliers =
      Array.isArray(result?.data)
        ? result.data
        : [];

    const formatted =
      suppliers.map((supplier) => ({
        id: supplier.id,

        name:
          supplier.name || "",

        companyName:
          supplier.companyName || "",

        mobile:
          supplier.mobile || "",

        email:
          supplier.email || "",

        gstn:
          supplier.gstn || "",

        gstType:
          supplier.gstType || "",

        pan:
          supplier.pan || "",

        fssaiNumber:
          supplier.fssaiNumber || "",

        partyType:
          supplier.partyType || "supplier",

        partyCode:
          supplier.partyCode || "",

        creditPeriod:
          supplier.creditPeriod,

        creditLimit:
          Number(
            supplier.creditLimit || 0
          ),

        isActive:
          supplier.isActive !== false,
      }));

    return res.json({
      success: true,
      data: formatted,
      pagination:
        result?.pagination || null,
    });
  } catch (error) {
    console.error(
      "[Petpooja Suppliers] Error:",
      error?.response?.data ||
        error?.message
    );

    return res.status(
      error?.response?.status || 500
    ).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load suppliers",
      data: [],
    });
  }
};


// ============================================================
// CREATE PURCHASE BILL
//
// POST /api/petpooja/bills
// ============================================================

const createPurchaseBill = async (
  req,
  res
) => {

  try {

    const payload =
      req.body;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!payload) {

      return res.status(400).json({
        success: false,
        message:
          "Purchase bill payload is required",
      });

    }


    if (
      !Array.isArray(
        payload.lineItems
      ) ||
      payload.lineItems.length === 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "At least one purchase bill line item is required",
      });

    }


    if (
      !payload.partyId
    ) {

      return res.status(400).json({
        success: false,
        message:
          "partyId is required",
      });

    }


    // --------------------------------------------------------
    // SEND TO PETPOOJA
    // --------------------------------------------------------

    const result =
      await petpooja.createPurchaseBill(
        payload
      );


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({

      success: true,

      message:
        result?.message ||
        "Bill created successfully",

      voucherId:
        result?.voucherId ||
        null,

      voucherNumber:
        result?.voucherNumber ||
        null,

      mrnNumber:
        result?.mrnNumber ||
        null,

      data:
        result,

    });


  } catch (error) {

    console.error(
      "[Create Purchase Bill] Error:",
      error?.response?.data ||
      error?.message
    );


    return res.status(
      error?.response?.status ||
      500
    ).json({

      success: false,

      message:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create purchase bill",

      data:
        error?.response?.data ||
        null,

    });

  }
};

module.exports = {
  createPurchaseBill,
  updateStockAdjustment,
  createStockAdjustment,
  getPetpoojaSuppliers,
  createPetpoojaItem,
  searchPetpoojaItems,
  getPetpoojaItems,
  getPetpoojaItemById,
  getMasterData,
  getActiveMasterData
};