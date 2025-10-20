const mongoose = require('mongoose');

const AbuseIpDbSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    lastReportedAt: { type: Date, default: null },
    totalReports: { type: Number, default: 0 },
    abuseConfidenceScore: { type: Number, default: 0 },
    isListed: { type: Boolean, default: false },
    categories: { type: [Number], default: [] },
    countryCode: { type: String, default: null },
    domain: { type: String, default: null },
    isp: { type: String, default: null },
    isTor: { type: Boolean, default: false },
    isWhitelisted: { type: Boolean, default: false },
    usageType: { type: String, default: null }, // esempio: Data Center/Web Hosting/Residential etc.
}, { timestamps: true });

// Collezione: abuseipdb
module.exports = mongoose.model('AbuseIpDb', AbuseIpDbSchema);
