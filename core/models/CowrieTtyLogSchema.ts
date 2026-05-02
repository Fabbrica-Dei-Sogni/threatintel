/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICowrieTtyLog extends Document {
    session: string;
    timestamp: string;
    eventid: string;
    ttylog?: string;
    ttylogpath?: string;
    size?: number;
    shasum?: string;
    duration?: string | number;
    sensor?: string;
    [key: string]: any;
}

const CowrieTtyLogSchema: Schema = new Schema({
    session: { type: String, index: true },
    timestamp: String,
    eventid: String,
    ttylog: String, // Hex recording
    ttylogpath: String,
    size: Number,
    shasum: String,
    duration: Schema.Types.Mixed,
    sensor: String
}, { collection: 'ttylog', strict: false });

export const CowrieTtyLog: Model<ICowrieTtyLog> = mongoose.model<ICowrieTtyLog>('CowrieTtyLog', CowrieTtyLogSchema);
export default CowrieTtyLog;
