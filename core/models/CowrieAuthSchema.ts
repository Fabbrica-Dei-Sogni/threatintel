/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICowrieAuth extends Document {
    session: string;
    timestamp: string;
    eventid: string;
    username?: string;
    password?: string;
    message?: string;
    sensor?: string;
    src_ip?: string;
    [key: string]: any;
}

const CowrieAuthSchema: Schema = new Schema({
    session: { type: String, index: true },
    timestamp: String,
    eventid: String,
    username: String,
    password: String,
    message: String,
    sensor: String,
    src_ip: String
}, { collection: 'auth', strict: false });

export const CowrieAuth: Model<ICowrieAuth> = mongoose.model<ICowrieAuth>('CowrieAuth', CowrieAuthSchema);
export default CowrieAuth;
