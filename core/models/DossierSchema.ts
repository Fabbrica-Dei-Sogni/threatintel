/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import mongoose, { Document, Model, Schema } from 'mongoose';

export enum DossierStatus {
    DRAFT = 'draft',
    FINALIZED = 'finalized',
    ARCHIVED = 'archived'
}

export interface IDossierSection {
    type: string;           // 'ip', 'attack', 'telnet', 'custom_text', etc.
    templateKey: string;    // Chiave i18n
    data: Record<string, any>; // Dati eterogenei (Mixed)
    renderedText?: string;  // Snapshot testuale nella lingua del creatore
    order: number;          // Ordinamento manuale
    timestamp: Date;        // Quando è stata acquisita la sezione
    observations?: string[]; // Note investigative collaborative
}

export interface IDossier extends Document {
    title: string;
    description?: string;
    owner?: string;         // Identificativo dell'analista (opzionale per ora)
    status: DossierStatus;
    tags: string[];
    sections: IDossierSection[];
    createdAt: Date;
    updatedAt: Date;
}

const SectionSchema: Schema = new Schema({
    type: { type: String, required: true },
    templateKey: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    renderedText: { type: String, default: null },
    order: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    observations: { type: [String], default: [] }
}, { _id: false });

const DossierSchema: Schema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: String, index: true },
    status: {
        type: String,
        enum: Object.values(DossierStatus),
        default: DossierStatus.DRAFT,
        index: true
    },
    tags: [{ type: String, index: true }],
    sections: [SectionSchema],
}, {
    timestamps: true
});

// Indici per ricerche future sui contenuti delle sezioni
// Nota: Gli indici su campi Mixed sono limitati, ma possiamo indicizzare percorsi comuni
DossierSchema.index({ "sections.data.ip": 1 });
DossierSchema.index({ "sections.type": 1 });
DossierSchema.index({ createdAt: -1 });

const Dossier: Model<IDossier> = mongoose.model<IDossier>('Dossier', DossierSchema);

export default Dossier;
