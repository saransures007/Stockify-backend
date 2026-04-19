const express = require("express");
const router = express.Router();

const controller = require("../controllers/commonController");

router.post("/enquiry", controller.createFranchiseEnquiry);
router.get("/enquiry", controller.getFranchiseEnquiries);

module.exports = router;