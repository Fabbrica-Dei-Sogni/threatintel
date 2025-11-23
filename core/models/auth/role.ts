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
