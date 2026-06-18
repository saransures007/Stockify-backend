// services/settingsService.js

const Settings = require("../models/Settings");

exports.getStoreStatus = async () => {
  const settings = await Settings.findOne();

  if (!settings || !settings.storeStatus) {
    return {
      isOpen: false,
      openingTime: "09:00",
      closingTime: "21:00",
      holidayMode: false,
      temporaryCloseReason: "",
      lastStatusChange: null
    };
  }

  const {
    openingTime = "09:00",
    closingTime = "21:00",
    holidayMode = false,
    temporaryCloseReason = "",
    lastStatusChange = null
  } = settings.storeStatus;

  // IST Time
  const istNow = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    })
  );

  const currentMinutes =
    istNow.getHours() * 60 +
    istNow.getMinutes();

  const [openHour, openMinute] =
    openingTime.split(":").map(Number);

  const [closeHour, closeMinute] =
    closingTime.split(":").map(Number);

  const openMinutes =
    openHour * 60 + openMinute;

  const closeMinutes =
    closeHour * 60 + closeMinute;

  let isOpen = false;

  if (!holidayMode) {
    isOpen =
      currentMinutes >= openMinutes &&
      currentMinutes < closeMinutes;
  }

  return {
    isOpen,
    openingTime,
    closingTime,
    holidayMode,
    temporaryCloseReason,
    lastStatusChange,
    currentTime: istNow.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
  };
};