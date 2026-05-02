/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUserRole extends Document {
  user: Schema.Types.ObjectId;
  role: Schema.Types.ObjectId;
}

const userRoleSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  role: { type: Schema.Types.ObjectId, ref: 'Role' }
});

const UserRole: Model<IUserRole> = mongoose.model<IUserRole>('UserRole', userRoleSchema);

export default UserRole;
