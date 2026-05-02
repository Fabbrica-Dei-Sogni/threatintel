/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICowrieEvent extends Document {
    system?: string;
    eventid?: string;
    session?: string;
    protocol?: string;
    message?: string;
    time?: number;
    sensor?: string;
    uuid?: string;
    timestamp?: string;
    src_ip?: string;
    // Campi dinamici (es. input, username, password, command, shasum, ttylog)
    [key: string]: any;
}

const CowrieEventSchema: Schema = new Schema({
    system: String,
    eventid: String,
    session: { type: String, index: true }, // Index cruciale per ricercare tutti gli eventi di una singola sessione
    protocol: String,
    message: String,
    time: Number,
    sensor: String,
    uuid: String,
    timestamp: String,
    src_ip: String
}, { collection: 'event', strict: false }); // Permette il salvataggio dei payload variabili

export const CowrieEvent: Model<ICowrieEvent> = mongoose.model<ICowrieEvent>('CowrieEvent', CowrieEventSchema);
export default CowrieEvent;
