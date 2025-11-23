import mongoose, { Document, Model, Schema } from 'mongoose';
import { AbuseCategoryEnum } from './AbuseCategoryEnum';

export interface IAbuseReport extends Document {
  abuseIpDbId: Schema.Types.ObjectId;
  reportedAt: Date;
  comment: string;
  categories: number[];
  tags: string[];
  reporterId?: number;
  reporterCountryCode?: string;
  reporterCountryName?: string;
}

const AbuseReportSchema: Schema = new Schema({
  abuseIpDbId: { type: Schema.Types.ObjectId, ref: 'AbuseIpDb', required: true },
  reportedAt: { type: Date, required: true },
  comment: { type: String, required: true },
  categories: { type: [Number], enum: Object.values(AbuseCategoryEnum), default: [] },
  tags: { type: [String], default: [] },
  reporterId: { type: Number },
  reporterCountryCode: { type: String },
  reporterCountryName: { type: String }
}, { timestamps: true });

const AbuseReport: Model<IAbuseReport> = mongoose.model<IAbuseReport>('AbuseReport', AbuseReportSchema);

export default AbuseReport;
