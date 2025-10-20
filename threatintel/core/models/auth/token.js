const mongoose = require('mongoose');

// create mongoose schema
const tokenSchema = new mongoose.Schema(
    {
        //XXX: campo di tipo string (ndr e solo quelli) abilitati alla i18n tramite il plugin mongoose-intl
        token: {
            type: String,
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        expires: {
            type: Date,
            required: false
        },
        blacklisted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true
    },
    //XXX: importante opzione per normalizzare stringhe internazionalizzate all'output.
    //il chiamante angular avrà un json senza informazioni di lingua.
    //molto importante!
    {
        toJSON: {
            virtuals: true,
        }
    });

// create mongoose model
module.exports = mongoose.model('Token', tokenSchema);
