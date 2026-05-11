/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import dotenv from 'dotenv';
import { ConfigDefaults, parseCsv, getApiBaseUrl } from './utils/ConfigUtils';

console.log(`Get env variable with dotenv ...`);
dotenv.config();

export const port = process.env.PORT || ConfigDefaults.PORT;
export const mongoUri = process.env.MONGO_URI || ConfigDefaults.MONGO_URI;
export const uriDigitalAuth = process.env.URI_DIGITAL_AUTH;
export const appDomain = process.env.APP_DOMAIN || ConfigDefaults.APP_DOMAIN;
export const appBasePath = process.env.APP_BASE_PATH !== undefined ? process.env.APP_BASE_PATH : ConfigDefaults.APP_BASE_PATH;
export const allowedOrigins = parseCsv(process.env.ALLOWED_ORIGINS, ConfigDefaults.ALLOWED_ORIGINS);
export const apiBaseUrl = getApiBaseUrl(appDomain, port, process.env.API_BASE_URL, appBasePath);

export default {
    port,
    mongoUri,
    uriDigitalAuth,
    appDomain,
    allowedOrigins,
    apiBaseUrl,
    appBasePath
};
