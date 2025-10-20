const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userRoleSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    // Altri campi, se necessario
});

const UserRole = mongoose.model('UserRole', userRoleSchema);

module.exports = UserRole;