
const axios = require('axios');
const https = require('https');
const { verify } = require("../services/Authservice")

//TODO: portare a variabile di ambiente
//const secretkey = process.env.JWT_SECRET; //'questosegretoautenticailtoken';
const instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});


// Middleware per verificare il token di autenticazione
//parametrizzare in modo opportuno l'uri
/**
 * Callback di verifica token attraverso il modulo digital-auth
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    try {
        await verify(token);
        next();
    }
    catch (error) {
        res.status(500).json(error);
    }
    if (!token) {
        return res.status(401).json({ message: 'Token mancante' });
    }
}

module.exports = {
    verifyToken
};