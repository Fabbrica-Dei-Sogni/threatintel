/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  permissions: string[];
}

const roleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{ type: String }]
});

const Role: Model<IRole> = mongoose.model<IRole>('Role', roleSchema);

export default Role;
