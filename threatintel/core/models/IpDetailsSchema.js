const mongoose = require('mongoose');

const IpDetailsSchema = new mongoose.Schema({
    ip: { type: String, unique: true, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    enrichedAt: { type: Date, default: Date.now },
    ipinfo: { type: Object, default: null },
    whois_raw: { type: String, default: null },
    abuseipdbId: { type: mongoose.Schema.Types.ObjectId, ref: 'AbuseIpDb', default: null }    
});

module.exports = mongoose.model('IpDetails', IpDetailsSchema);