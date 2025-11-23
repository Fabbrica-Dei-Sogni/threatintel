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
