/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICowrieInput extends Document {
    session: string;
    timestamp: string;
    eventid: string;
    input?: string;
    message?: string;
    sensor?: string;
    src_ip?: string;
    [key: string]: any;
}

const CowrieInputSchema: Schema = new Schema({
    session: { type: String, index: true },
    timestamp: String,
    eventid: String,
    input: String,
    message: String,
    sensor: String,
    src_ip: String
}, { collection: 'input', strict: false });

export const CowrieInput: Model<ICowrieInput> = mongoose.model<ICowrieInput>('CowrieInput', CowrieInputSchema);
export default CowrieInput;
