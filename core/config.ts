/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import dotenv from 'dotenv';

console.log(`Get env variable with dotenv ...`);
dotenv.config();

export const port = process.env.PORT || '3000';
export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:17017/threatintel';
export const uriDigitalAuth = process.env.URI_DIGITAL_AUTH;

export default { port, mongoUri, uriDigitalAuth };
