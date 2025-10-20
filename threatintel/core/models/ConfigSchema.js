const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});

const Configuration = mongoose.model('Configuration', ConfigSchema);

module.exports = Configuration;
