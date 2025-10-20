const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    ip: String,
    jndiPayload: { type: String, default: null },  // aggiunto campo per payload JNDI
    method: String,
    url: String,
    userAgent: String,
    referer: String,
    headers: Object,
    body: Object,
    query: Object,
    cookies: Object
}, { _id: false });

const GeoSchema = new mongoose.Schema({
    country: String,
    region: String,
    city: String,
    coordinates: [Number],
    timezone: String,
    asn: String,
    isp: String
}, { _id: false });

const FingerprintSchema = new mongoose.Schema({
    hash: String,
    suspicious: Boolean,
    score: Number,
    indicators: [String]
}, { _id: false });

const ResponseSchema = new mongoose.Schema({
    statusCode: Number,
    responseTime: Number,
    size: Number
}, { _id: false });

const MetadataSchema = new mongoose.Schema({
    sessionId: String,
    userAgent_parsed: Object,
    isBot: Boolean,
    isCrawler: Boolean
}, { _id: false });

const ThreatLogSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    timestamp: { type: Date, default: Date.now },
    request: RequestSchema,
    geo: GeoSchema,
    fingerprint: FingerprintSchema,
    response: ResponseSchema,
    metadata: MetadataSchema,
    ipDetailsId: { type: mongoose.Schema.Types.ObjectId, ref: 'IpDetails', default: null } // REFERENZA!
});

module.exports = mongoose.model('ThreatLog', ThreatLogSchema);