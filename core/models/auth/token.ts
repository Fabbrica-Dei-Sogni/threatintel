import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IToken extends Document {
  token: string;
  user: Schema.Types.ObjectId;
  expires?: Date;
  blacklisted?: boolean;
}

const tokenSchema: Schema = new Schema(
  {
    token: {
      type: String,
      required: true,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expires: {
      type: Date,
      required: false
    },
    blacklisted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }
  }
);

const Token: Model<IToken> = mongoose.model<IToken>('Token', tokenSchema);

export default Token;
