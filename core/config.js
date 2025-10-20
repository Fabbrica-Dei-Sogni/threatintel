const fs = require("fs");
const path = require("path");
console.log(`Get env variable with dotenv ...`);
require("dotenv").config();

const port = process.env.PORT || "3000";
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:17017/threatintel'
const uriDigitalAuth = process.env.URI_DIGITAL_AUTH;

module.exports = { port, mongoUri, uriDigitalAuth }