const { processMessage } = require("../services/aiService");

const chat = async (req, res) => {
  try {
    const { message } = req.body;

    const reply = await processMessage(message);

    res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error("AI error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { chat };