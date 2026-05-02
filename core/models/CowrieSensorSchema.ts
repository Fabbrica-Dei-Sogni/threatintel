/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICowrieSensor extends Document {
    sensor?: string;
    [key: string]: any;
}

const CowrieSensorSchema: Schema = new Schema({
    sensor: { type: String, unique: true }
}, { collection: 'sensors', strict: false });

export const CowrieSensor: Model<ICowrieSensor> = mongoose.model<ICowrieSensor>('CowrieSensor', CowrieSensorSchema);
export default CowrieSensor;
