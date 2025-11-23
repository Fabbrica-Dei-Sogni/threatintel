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
