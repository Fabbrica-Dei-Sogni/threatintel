/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IConfiguration extends Document {
    key: string;
    value: string;
}

const ConfigSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});

const Configuration: Model<IConfiguration> = mongoose.model<IConfiguration>('Configuration', ConfigSchema);

export default Configuration;
