/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ICowrieSession extends Document {
    system?: string;
    eventid?: string;
    src_ip?: string;
    src_port?: number;
    dst_ip?: string;
    dst_port?: number;
    session: string;
    protocol?: string;
    message?: string;
    time?: number;
    sensor?: string;
    uuid?: string;
    timestamp?: string;
    starttime?: string;
    endtime?: string;
    sshversion?: string | null;
    termsize?: string | null;
    ipDetailsId?: Types.ObjectId | null;
    isScannerActivity?: boolean;
    scannerStats?: {
        totalOccurrences: number;
        firstSeen: string;
        lastSeen: string;
        duration: number;
    };
}

const CowrieSessionSchema: Schema = new Schema({
    system: String,
    eventid: String,
    src_ip: String,
    src_port: Number,
    dst_ip: String,
    dst_port: Number,
    session: { type: String, unique: true, required: true },
    protocol: String,
    message: String,
    time: Number,
    sensor: String,
    uuid: String,
    timestamp: String,
    starttime: String,
    endtime: String,
    sshversion: { type: String, default: null },
    termsize: { type: String, default: null },
    ipDetailsId: { type: Schema.Types.ObjectId, ref: 'IpDetails', default: null }
}, { collection: 'sessions', strict: false }); // strict: false allows any unexpected fields from cowrie

export const CowrieSession: Model<ICowrieSession> = mongoose.model<ICowrieSession>('CowrieSession', CowrieSessionSchema);
export default CowrieSession;
