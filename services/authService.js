const Customer = require("../models/Customer");
const petpooja = require("./petpoojaService");


const findOrCreateUser = async (userData) => {
  console.log("🔥 [START] findOrCreateUser");
  console.log("📦 Incoming userData:", userData);

  try {
    const { email, mobile } = userData;
    const phone = mobile || null;

    // 🚨 VALIDATION
    if (!email) {
      console.log("❌ Missing email");
      throw new Error("Email is required");
    }

    // 🔍 STEP 1: CHECK EXISTING USER
    console.log("🔍 Checking existing customer...");
    
    let customer = await Customer.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])]
    });

    if (customer) {
      console.log("✅ Existing customer found:", customer._id);

      return await handleExistingCustomer(customer); // 🔥 use the flow above
    }

    console.log("⚠️ No existing customer found");

    // 🚨 STEP 2: MOBILE CHECK
    if (!phone) {
      console.log("📱 Mobile missing → sending needsMobile response");

      return {
        needsMobile: true,
        tempUser: {
          name: userData.name,
          email: userData.email,
          image: userData.image,
          provider: userData.provider,
          providerId: userData.providerId
        }
      };
    }

    console.log("✅ Mobile present:", phone);

    // 🔍 STEP 3: CHECK PETPOOJA
    console.log("🔍 Checking Petpooja party...");

    let party = null;

    try {
      party = await petpooja.findParty({
        name: userData.name,
        mobile:phone,
      });

      console.log("📦 Petpooja find result:", party);
    } catch (err) {
      console.log("❌ Petpooja findParty error:", err.message);
    }

    // ➕ STEP 4: CREATE PARTY IF NOT FOUND
    if (!party) {
      console.log("➕ Creating new Petpooja party...");

      try {
        const payload = buildPartyPayload(userData);

        console.log("📦 Creating Petpooja party with:", payload);

        party = await petpooja.createParty(payload);
        console.log("✅ Party created:", party.id);
      } catch (err) {
        console.log("❌ Petpooja createParty error:", err.message);
        throw new Error("Failed to create customer in Petpooja");
      }
    }

    // 💾 STEP 5: SAVE LOCAL USER
    console.log("💾 Saving customer locally...");

    customer = await Customer.create({
      name: party.name || userData.name,
      email: party.email || email,
      phone: party.mobile || phone,

      petpoojaPartyId: party.id,
      partyCode: party.partyCode,

      image: userData.image || null,
      provider: userData.provider,
      providerId: userData.providerId,

      loyaltyPoints: 0,
    });

    console.log("🎉 User created successfully:", customer._id);

    return customer;

  } catch (error) {
    console.log("💥 ERROR in findOrCreateUser:", error.message);
    throw error;
  }
};

const normalizeMobile = (m) => (m || "").replace(/\D/g, "").slice(-10);

async function handleExistingCustomer(customer) {
  customer.lastLogin = new Date();

  let party = null;

  // 1️⃣ Find by phone in Petpooja
  if (customer.phone) {
    const mobile10 = normalizeMobile(customer.phone);

    try {
      console.log("🔍 Finding Petpooja party by mobile:", mobile10);
      const found = await petpooja.findParty({
        name: customer.name,
        mobile: mobile10,
      });

      // If API returns list, pick exact mobile match
      party = Array.isArray(found)
        ? found.find(p => normalizeMobile(p.mobile) === mobile10)
        : found;
    } catch (e) {
      console.log("⚠️ findParty error:", e.message);
    }
  }

  // 2️⃣ If not found → create new party
  if (!party) {
    console.log("♻️ Creating new Petpooja party (by phone flow)");

    const payload = buildPartyPayload({
      name: customer.name,
      email: customer.email,
      mobile: customer.phone,
    });
    console.log("📦 Party payload:", payload);

    const created = await petpooja.createParty(payload);
    console.log("✅ Party created:", created);
    party = created;
  }

  // 3️⃣ Sync + link
  if (party) {
    console.log("🔗 Linking customer to Petpooja party:", party.id);
    customer.petpoojaPartyId = party.id;
    customer.partyCode = party.partyCode;

    customer.name = party.name || customer.name;
    customer.phone = party.mobile || customer.phone;
    customer.loyaltyPoints =
      party.loyaltyPoints ?? customer.loyaltyPoints;

    customer.isActive = true;
  }

  await customer.save();
  return customer;
}


const buildPartyPayload = (userData) => {
  const mobile = userData.mobile;

  if (!mobile || mobile.length < 4) {
    throw new Error("Invalid mobile for partyCode");
  }

  const partyCode = mobile.slice(-4);

  return {
    name: userData.name || "Customer",
    companyName: userData.name || "Customer",

    partyCode,

    mobile,
    email: userData.email,

    gstn: null,
    gstType: null,
    hasGST: false,
    pan: null,

    partyType: "customer",
    isActive: true,

    tags: [],
    dnd: false,
    bankDetails: {},

    isAutoNumber: false,

    addresses: [
      {
        country: "India",
        type: "billing"
      },
      {
        country: "India",
        type: "shipping"
      }
    ]
  };
};

module.exports = { findOrCreateUser };