const FranchiseEnquiry = require("../models/franchiseEnquiry");

const createFranchiseEnquiry = async (data) => {
  return await FranchiseEnquiry.create(data);
};

const getFranchiseEnquiries = async () => {
  return await FranchiseEnquiry.find().sort({ createdAt: -1 });
};

const findByPhone = async (phone) => {
  return await FranchiseEnquiry.findOne({ phone });
};

module.exports = {
  createFranchiseEnquiry,
  getFranchiseEnquiries,
  findByPhone,
};