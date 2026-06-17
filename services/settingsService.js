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

    const [oh, om] = openingTime.split(":").map(Number);
    const [ch, cm] = closingTime.split(":").map(Number);

    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;

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
    lastStatusChange
  };
};