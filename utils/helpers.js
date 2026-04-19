const formatItem = (item) => {
  return {
    id: item.id,
    name: item.itemName,
    image: item.image || null,
    category: {
      id: item.categoryId,
      name: item.categoryName
    },
    price: Number(item.salesRate).toFixed(2),
    group: {
      id: item.groupId,
      name: item.groupName
    },
    isActive: item.isActive,

    variants: (item.variants || []).map(v => {
      let attributes = {};

      try {
        attributes = JSON.parse(v.variantAttributes || '{}');
      } catch (e) {}

      return {
        id: v.id,
        name: v.itemName,
        price: Number(v.salesRate),
        mrp: Number(v.mrp),
        size: attributes.Size || null,
        flavor: attributes.Flavor || null,
        isActive: v.isActive
      };
    })
  };
};

module.exports = {formatItem} ;