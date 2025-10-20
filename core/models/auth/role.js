const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Nome del ruolo
    permissions: [{ type: String }], // Array di autorizzazioni associate al ruolo
    // Altri campi, se necessario
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;