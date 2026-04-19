const petpooja = require('../services/petpoojaService');
const { formatItem } = require('../utils/helpers');
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


module.exports = {
  getPetpoojaItems,
  getPetpoojaItemById,
  getMasterData,
  getActiveMasterData
};