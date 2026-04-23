// /config/firebaseAdmin.js

const admin = require("firebase-admin");
const serviceAccount = require("./1minutefirebasekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;