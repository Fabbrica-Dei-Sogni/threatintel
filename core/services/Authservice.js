
const axios = require('axios');
const https = require('https');
const Role = require('../models/auth/role'); // Importa il modello per i ruoli
const User = require('../models/auth/user'); // Importa il modello per gli utenti
const { uriDigitalAuth } = require('../config');
const instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const verify = async function (token) { 

    console.log(`Verifica del token di autenticazione verso lo issuer Digital Auth... ${uriDigitalAuth}`);
    if (!token) {
        throw { message: 'Token mancante' };
    }

    try {

        const response = await instance.post(
            `${uriDigitalAuth}/verify`,
            {}, // Puoi passare un body vuoto se non hai dati nel corpo della richiesta
            {
                headers: {
                    'Authorization': token
                }
            }
        );

        if (response.data.success) {
            console.log("Verifica token ok!");
            return response.data.success;
        } else {
            console.error(`Validazione token fallita: ${response.data.message}`);
            throw { message: response.data.message };
        }
    } catch (error) {
        console.error(`Errore durante la verifica token : ${error.response.data.message}`);
        throw error.response.data;
    }    
}

/**
 * Callback per verificare il ruolo dell'utente attraverso il modulo digital-auth
 * @param {*} role 
 * @returns 
 */
// Middleware per verificare i ruoli dell'utente
function checkRole(role) {
    return (req, res, next) => {
        // Verifica se l'utente ha il ruolo richiesto
        if (req.user.roles.includes(role)) {
            next();
        } else {
            res.status(403).json({ message: 'Autorizzazione negata' });
        }
    };
}

module.exports = {
    checkRole,
    verify
};



