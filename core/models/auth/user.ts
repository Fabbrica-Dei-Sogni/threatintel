/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  age?: number;
  username?: string;
  email?: string;
  password?: string;
  roles?: Schema.Types.ObjectId[];
}

const userSchema: Schema = new Schema(
  {
    name: { type: String },
    age: Number,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }]
  },
  {
    toJSON: {
      virtuals: true
    }
  }
);

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
