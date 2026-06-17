const Settings = require("../models/Settings");

exports.getStoreStatus = async (req, res) => {
  try {
    const settings = await Settings.findOne();

    if (!settings || !settings.storeStatus) {
      return res.json({
        success: true,
        data: {
          isOpen: false,
          openingTime: "09:00",
          closingTime: "21:00",
          holidayMode: false,
          temporaryCloseReason: "",
          lastStatusChange: null
        }
      });
    }

    const {
      openingTime,
      closingTime,
      holidayMode,
      temporaryCloseReason,
      lastStatusChange
    } = settings.storeStatus;

    let isOpen = false;

    if (!holidayMode) {
      const now = new Date();

      const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

      const [oh, om] =
        openingTime.split(":").map(Number);

      const [ch, cm] =
        closingTime.split(":").map(Number);

      const openMinutes =
        oh * 60 + om;

      const closeMinutes =
        ch * 60 + cm;

      isOpen =
        currentMinutes >= openMinutes &&
        currentMinutes < closeMinutes;
    }

    res.json({
      success: true,
      data: {
        isOpen,
        openingTime,
        closingTime,
        holidayMode,
        temporaryCloseReason,
        lastStatusChange
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch store status"
    });
  }
};