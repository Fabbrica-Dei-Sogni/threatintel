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
