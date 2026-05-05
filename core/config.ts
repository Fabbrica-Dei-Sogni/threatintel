import dotenv from 'dotenv';

console.log(`Get env variable with dotenv ...`);
dotenv.config();

export const port = process.env.PORT || '3000';
export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:17017/threatintel';
export const uriDigitalAuth = process.env.URI_DIGITAL_AUTH;
export const appDomain = process.env.APP_DOMAIN || 'localhost';
export const apiBaseUrl = process.env.API_BASE_URL || `http://${appDomain}:${port}/honeypot/api`;

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4300'
];

export const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
  : defaultOrigins;

export default { port, mongoUri, uriDigitalAuth, appDomain, allowedOrigins };
