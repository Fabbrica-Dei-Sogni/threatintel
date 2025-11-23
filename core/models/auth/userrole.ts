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
