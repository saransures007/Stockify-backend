const Settings = require("../models/Settings");

const getStoreStatus = async () => {
  try {
    const settings = await Settings.findOne().select("storeStatus");

    // 🔥 DEFAULT FALLBACK
    if (!settings) {
      return {
        isOpen: true,
        openingTime: "09:00",
        closingTime: "21:00",
        holidayMode: false,
        message: "Store is open"
      };
    }

    const {
      isOpen,
      openingTime,
      closingTime,
      holidayMode,
      temporaryCloseReason,
      lastStatusChange
    } = settings.storeStatus || {};

    let message = "";

    if (holidayMode) {
      message = "Store is closed for holiday";
    } else if (!isOpen) {
      message = temporaryCloseReason || "Store is currently closed";
    } else {
      message = `Store is open (${openingTime} - ${closingTime})`;
    }

    return {
      isOpen: isOpen && !holidayMode,
      openingTime,
      closingTime,
      holidayMode,
      message,
      lastStatusChange
    };

  } catch (error) {
    console.error("Service: getStoreStatus error:", error);

    // 🔥 SAFE FALLBACK (VERY IMPORTANT for AI)
    return {
      isOpen: false,
      message: "Unable to check store status right now"
    };
  }
};

module.exports = { getStoreStatus };