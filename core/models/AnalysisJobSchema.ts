import mongoose, { Schema, Document } from 'mongoose';

export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export interface IAnalysisJob extends Document {
    type: string;
    status: JobStatus;
    progress: number; // 0-100
    metadata: {
        processed: number;
        total: number;
        errors: string[];
        params: any;
    };
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    createdBy?: string;
}

const AnalysisJobSchema: Schema = new Schema({
    type: { type: String, required: true },
    status: { type: String, enum: Object.values(JobStatus), default: JobStatus.PENDING },
    progress: { type: Number, default: 0 },
    metadata: {
        processed: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        errors: { type: [String], default: [] },
        params: { type: Schema.Types.Mixed, default: {} }
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String },
    createdBy: { type: String, default: 'system' }
}, {
    timestamps: true
});

// Indici per query veloci dalla dashboard
AnalysisJobSchema.index({ status: 1, type: 1 });
AnalysisJobSchema.index({ createdAt: -1 });

export default mongoose.model<IAnalysisJob>('AnalysisJob', AnalysisJobSchema);
