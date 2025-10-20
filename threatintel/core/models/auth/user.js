const mongoose = require('mongoose');

// create mongoose schema
const userSchema = new mongoose.Schema(
    {
        //XXX: campo di tipo string (ndr e solo quelli) abilitati alla i18n tramite il plugin mongoose-intl
        name: { type: String },
        age: Number,
        username: { type: String, unique: true },
        email: { type: String, unique: true },
        password: { type: String },
        roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }], // Riferimento ai ruoli assegnati all'utente

    },  //XXX: importante opzione per normalizzare stringhe internazionalizzate all'output.
    //il chiamante angular avrà un json senza informazioni di lingua.
    //molto importante!
    {
        toJSON: {
            virtuals: true,
        }
    });

// create mongoose model
module.exports = mongoose.model('User', userSchema);
