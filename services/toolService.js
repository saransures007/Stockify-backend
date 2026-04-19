const {getStoreStatus} = require("./settingsService");


const petpooja = require("./petpoojaService");

// 🔥 Tools visible to AI
const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products in store",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_store_status",
      description: "Check if store is open",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// 🔥 Tool execution
const handleToolCall = async (toolCall) => {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args || "{}");

  switch (name) {
    case "search_products":
      const items = await petpooja.getItems(1, 5, {
        item_name: parsed.query
      });
      return items.data || [];

    case "check_store_status":
      return await getStoreStatus();

    default:
      return { error: "Unknown tool" };
  }
};

module.exports = { tools, handleToolCall };