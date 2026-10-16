// const formatItem = (item) => {
//   return {
//     id: item.id,
//     name: item.itemName,
//     image: item.image || null,
//     category: {
//       id: item.categoryId,
//       name: item.categoryName
//     },
//     price: Number(item.salesRate).toFixed(2),
//     group: {
//       id: item.groupId,
//       name: item.groupName
//     },
//     isActive: item.isActive,

//     variants: (item.variants || []).map(v => {
//       let attributes = {};

//       try {
//         attributes = JSON.parse(v.variantAttributes || '{}');
//       } catch (e) {}

//       return {
//         id: v.id,
//         name: v.itemName,
//         price: Number(v.salesRate),
//         mrp: Number(v.mrp),
//         size: attributes.Size || null,
//         flavor: attributes.Flavor || null,
//         isActive: v.isActive
//       };
//     })
//   };
// };

 const formatItem = (item) => {

  let sac = [];

  if (
    Array.isArray(item?.sac)
  ) {

    sac = item.sac;

  } else if (
    typeof item?.sac === "string" &&
    item.sac.trim()
  ) {

    try {

      const parsed =
        JSON.parse(
          item.sac
        );

      sac =
        Array.isArray(parsed)
          ? parsed
          : [item.sac];

    } catch {

      sac = [
        item.sac,
      ];
    }
  }

  return {

    id:
      item?.id,

    itemName:
      item?.itemName || "",

    description:
      item?.description || "",

    sac,

    hsn:
      item?.hsn || "",

    itemCode:
      item?.itemCode || "",

    barcode:
      item?.barcode || "",

    mrp:
      this.toNumber(
        item?.mrp
      ),

    purchaseRate:
      this.toNumber(
        item?.purchaseRate
      ),

    salesRate:
      this.toNumber(
        item?.salesRate
      ),

    stock:
      this.toNumber(
        item?.stock?.total ??
        item?.availableStockQty ??
        item?.totalStock
      ),

    unit:
      typeof item?.unit === "object"
        ? item.unit?.name || ""
        : item?.unit || "",

  };
}

module.exports = {formatItem} ;