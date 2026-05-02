/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { DossierStatus, IDossierSection } from '../DossierSchema';

/**
 * DTO per la creazione di un nuovo Dossier.
 */
export interface CreateDossierDTO {
    title: string;
    description?: string;
    owner?: string;
    status?: DossierStatus;
    tags?: string[];
    sections: IDossierSection[];
}

/**
 * DTO per l'aggiornamento parziale di un Dossier.
 */
export interface UpdateDossierDTO {
    title?: string;
    description?: string;
    status?: DossierStatus;
    tags?: string[];
    sections?: IDossierSection[];
}

/**
 * Struttura della risposta API per un Dossier.
 */
export interface DossierResponseDTO {
    id: string;
    title: string;
    description?: string;
    owner?: string;
    status: DossierStatus;
    tags: string[];
    sections: IDossierSection[];
    createdAt: Date;
    updatedAt: Date;
}
