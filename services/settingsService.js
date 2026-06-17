const Settings = require("../models/Settings");

exports.updateStoreStatus = async (req, res) => {
  try {
    const {
      isOpen,
      openingTime,
      closingTime,
      holidayMode,
      temporaryCloseReason
    } = req.body;

    
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings({});
    }

    settings.storeStatus = {
      isOpen,
      openingTime,
      closingTime,
      holidayMode,
      temporaryCloseReason,
      lastStatusChange: new Date()
    };

    await settings.save();

    res.json({
      success: true,
      data: settings.storeStatus
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update store status"
    });
  }
};