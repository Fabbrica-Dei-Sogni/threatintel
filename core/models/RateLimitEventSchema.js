const mongoose = require('mongoose');

const RateLimitEventSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    userAgent: { type: String },
    path: { type: String, required: true },
    method: { type: String },
    limitType: {
        type: String,
        enum: ['ddos-protection', 'critical-endpoints', 'trap-endpoints', 'application'],
        required: true
    },
    timestamp: { type: Date, default: Date.now },
    headers: { type: Object },
    honeypotId: { type: String },
    message: { type: String }  // può contenere messaggi personalizzati dell'evento
});

const RateLimitEvent = mongoose.model('RateLimitEvent', RateLimitEventSchema);

module.exports = RateLimitEvent;
