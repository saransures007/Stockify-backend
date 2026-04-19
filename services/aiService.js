const client = require("./aiClient");
const { tools, handleToolCall } = require("./toolService");
const { getCache, setCache } = require("./cacheService");
const petpooja = require("./petpoojaService");
const rateLimiter = require("../middleware/rateLimiter");
const MODELS = ["llama-3.1-8b-instant", "mixtral-8x7b-32768"];

const basePrompt = `
You are a smart AI store assistant for a retail convenience store.

━━━━━━━━━━━━━━━━━━━━━━━
🏪 STORE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━
- This is a small convenience store (NOT a supermarket, NOT electronics store)
- Only items from given Categories and Groups are sold
- You MUST NOT suggest items outside store catalog

━━━━━━━━━━━━━━━━━━━━━━━
🎯 GOAL
━━━━━━━━━━━━━━━━━━━━━━━
Help customers like a friendly shopkeeper:
- Answer naturally
- Give accurate real-time info
- Guide user to available products

━━━━━━━━━━━━━━━━━━━━━━━
🧠 LANGUAGE & UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━━
- Understand: English, Tamil, Tanglish (mixed)
- Handle typos and understand intent, not exact words

━━━━━━━━━━━━━━━━━━━━━━━
🗣️ RESPONSE STYLE & LENGTH
━━━━━━━━━━━━━━━━━━━━━━━
- Friendly and human-like
- Use simple English (no emojis)
- SHORT responses (2-3 sentences) for simple answers
- LONG responses (up to 100+ words) ONLY when:
  * Showing product lists with prices
  * Comparing multiple items
  * Providing detailed category suggestions
- For availability checks: Keep it brief unless showing many products

━━━━━━━━━━━━━━━━━━━━━━━
📦 PRODUCT RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━
- You DO NOT know product availability
- You MUST ALWAYS use tools to check products
- NEVER assume or guess

━━━━━━━━━━━━━━━━━━━━━━━
🚫 STRICT RESTRICTIONS
━━━━━━━━━━━━━━━━━━━━━━━
- DO NOT hallucinate products
- DO NOT suggest items outside store categories
- DO NOT say "available" without tool confirmation
- DO NOT mention brands not in store

━━━━━━━━━━━━━━━━━━━━━━━
🔍 SEARCH & DISPLAY BEHAVIOR
━━━━━━━━━━━━━━━━━━━━━━━
- Extract product from user message
- If vague: search by category
- When showing products:
  * Show 2-5 items with prices
  * Format: "Product Name - ₹Price"
  * You CAN use multiple lines for product lists
- If no results: Suggest categories or similar items briefly

━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGGESTION RULES
━━━━━━━━━━━━━━━━━━━━━━━
- ONLY suggest from tool results
- If product not available:
  → Suggest from SAME category (if data available)
  → Keep suggestions concise (2-3 items max)

━━━━━━━━━━━━━━━━━━━━━━━
🏪 STORE STATUS RULES
━━━━━━━━━━━━━━━━━━━━━━━
- Always use tool for store status
- Reply: "Store is open (9:00 - 21:00)" or "Store is closed"

━━━━━━━━━━━━━━━━━━━━━━━
📏 LENGTH GUIDELINES EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━

SHORT response (simple answer):
User: "Store open?"
Reply: Yes, store is open from 9 AM to 9 PM.

SHORT response (not available):
User: "KitKat available?"
Reply: KitKat is currently out of stock. Would you like Dairy Milk instead?

LONG response (product list - OK to be 100+ words):
User: "What cold drinks do you have?"
Reply: We have several cold drinks available:
Coke - ₹40
Sprite - ₹40
ThumsUp - ₹40
Fanta - ₹40
Maaza - ₹35
Limca - ₹40
Pepsi - ₹40
Mountain Dew - ₹45
Which one would you like?

LONG response (category suggestion):
User: "What chocolates are there?"
Reply: Here are the chocolates we have in stock:
Dairy Milk (₹50-₹200 depending on size)
KitKat (₹20-₹100)
Munch (₹10-₹50)
5Star (₹20-₹60)
Perk (₹20-₹50)
Silk (₹80-₹250)
We have small and large packs available for most.

━━━━━━━━━━━━━━━━━━━━━━━
🎯 FINAL RULE
━━━━━━━━━━━━━━━━━━━━━━━
Always prioritize: Accuracy, Store data, User clarity
Short for simple answers, long only when showing products/prices
If unsure → ask user clarification
Never guess.
`;

const callModel = async (messages, isProductList = false) => {
  for (const model of MODELS) {
    try {
      // Use higher max_tokens for product lists, lower for regular responses
      const maxTokens = isProductList ? 300 : 150;
      
      return await client.chat.completions.create({
        model,
        messages,
        tools,
        temperature: 0.3,
        max_tokens: maxTokens
      });
    } catch (err) {
      console.log("Model failed:", model);
    }
  }
  throw new Error("All models failed");
};

// Helper to detect if response needs to be longer
const needsLongResponse = (message, toolResult) => {
  // Check if we're showing multiple products
  if (toolResult && toolResult.products && toolResult.products.length > 2) {
    return true;
  }
  
  // Check message intent for list requests
  const listIndicators = ['what', 'which', 'list', 'all', 'show me', 'tell me', 'available', 'have', 'got'];
  const lowerMsg = message.toLowerCase();
  
  // If asking for products without specific name
  const isAskingForList = listIndicators.some(indicator => lowerMsg.includes(indicator)) &&
                         !lowerMsg.match(/(specific|particular|only|just|exact)/);
  
  // Check for category queries
  const categoryQueries = ['chocolate', 'drink', 'snack', 'chip', 'biscuit', 'cold drink', 'ice cream'];
  const isCategoryQuery = categoryQueries.some(cat => lowerMsg.includes(cat));
  
  return (isAskingForList && isCategoryQuery) || 
         (toolResult && toolResult.products && toolResult.products.length > 3);
};

// Post-process to ensure length appropriateness
const adjustResponseLength = (response, toolResult) => {
  if (!response) return response;
  
  // If showing product list and response is too short, help format it better
  if (toolResult && toolResult.products && toolResult.products.length > 0) {
    // Check if response already has line breaks (good for lists)
    if (!response.includes('\n') && response.split('.').length < 3) {
      // Response is too short for a product list, might need reformatting
      console.log("Warning: Product list response might be too brief");
    }
  }
  
  // For non-product responses, ensure they're not too long
  if (!toolResult || !toolResult.products || toolResult.products.length === 0) {
    if (response.length > 200 && !response.includes('\n')) {
      // Trim overly long regular responses
      response = response.substring(0, 180) + '...';
    }
  }
  
  return response;
};

const processMessage = async (message) => {
      // Apply rate limiting
  await rateLimiter.waitForToken();
  const cacheKey = message.toLowerCase().trim();

  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 🔥 MASTER DATA
  const master = await petpooja.getMasterData();

  const dynamicPrompt = `
${basePrompt}
`;

  console.log("dynamicPrompt", dynamicPrompt);

  const response = await callModel([
    { role: "system", content: dynamicPrompt },
    { role: "user", content: message }
  ], false);
  
  const msg = response.choices[0].message;
  let finalReply = msg.content || "";

  // 🔥 TOOL CALL
  if (msg.tool_calls?.length) {
    const toolCall = msg.tool_calls[0];
    const toolResult = await handleToolCall(toolCall);
    
    console.log("toolResult", toolResult);
    
    // Determine if we need longer response based on tool result
    const needLongResponse = needsLongResponse(message, toolResult);
    
    const final = await callModel([
      { role: "system", content: dynamicPrompt },
      { role: "user", content: message },
      msg,
      {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      }
    ], needLongResponse);
    
    finalReply = final.choices[0].message.content;
  }
  
  // Adjust response length if needed
  const toolResultForAdjustment = msg.tool_calls?.length ? 
    await handleToolCall(msg.tool_calls[0]) : null;
  finalReply = adjustResponseLength(finalReply, toolResultForAdjustment);
  
  // Ensure response isn't empty
  if (!finalReply || finalReply.length < 2) {
    finalReply = "I didn't understand. Could you please rephrase?";
  }
  
  setCache(cacheKey, finalReply);
  return finalReply;
};

module.exports = { processMessage };