const service = require("../services/franchiseEnquiry.service");

const createFranchiseEnquiry = async (req, res) => {
  try {
    console.log(req)
    const { name, phone, email, city } = req.body;

    // ✅ Validation
    if (!name || !phone || !email || !city) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✅ Duplicate check (efficient)
    const existing = await service.findByPhone(phone);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already submitted",
      });
    }

    const data = await service.createFranchiseEnquiry(req.body);

    return res.status(201).json({
      success: true,
      message: "Franchise enquiry submitted successfully",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getFranchiseEnquiries = async (req, res) => {
  try {
    const data = await service.getFranchiseEnquiries();

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

module.exports = {
  createFranchiseEnquiry,
  getFranchiseEnquiries,
};