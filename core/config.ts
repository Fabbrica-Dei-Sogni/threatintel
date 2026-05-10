import dotenv from 'dotenv';
import { parseCsv, getApiBaseUrl } from './utils/ConfigHelpers';
import { CONFIG_MANIFEST } from './config/ConfigManifest';

console.log(`Get env variable with dotenv ...`);
dotenv.config();

/**
 * Helper per recuperare il default dal manifest
 */
const getDefault = (key: string): string => {
    return CONFIG_MANIFEST.find(p => p.key === key)?.defaultValue || '';
};

export const port = process.env.PORT || getDefault('PORT');
export const mongoUri = process.env.MONGO_URI || getDefault('MONGO_URI');
export const uriDigitalAuth = process.env.URI_DIGITAL_AUTH || getDefault('URI_DIGITAL_AUTH');
export const appDomain = process.env.APP_DOMAIN || getDefault('APP_DOMAIN');

export const allowedOrigins = parseCsv(process.env.ALLOWED_ORIGINS, parseCsv(getDefault('ALLOWED_ORIGINS')));
export const apiBaseUrl = getApiBaseUrl(appDomain, port, process.env.API_BASE_URL);

export default { 
    port, 
    mongoUri, 
    uriDigitalAuth, 
    appDomain, 
    allowedOrigins, 
    apiBaseUrl 
};
