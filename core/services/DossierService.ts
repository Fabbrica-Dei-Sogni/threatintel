import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import Dossier, { IDossier, DossierStatus, IDossierSection } from '../models/DossierSchema';
import { CreateDossierDTO, UpdateDossierDTO, DossierResponseDTO } from '../models/dto/DossierDTO';
import { ReportService } from './ReportService';
import { SanitizationUtils } from '../utils/SanitizationUtils';
import { sanitizePage, sanitizePageSize, escapeRegex } from '../utils/queryGuard';

@injectable()
export class DossierService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly reportService: ReportService
    ) { }

    /**
     * Crea un nuovo Dossier sanificando i dati delle sezioni e assegnando l'owner.
     */
    async createDossier(dto: CreateDossierDTO, owner: string): Promise<IDossier> {
        this.logger.info(`[DossierService] Creazione nuovo dossier: ${dto.title} per owner: ${owner}`);

        // Sanificazione profonda di tutte le sezioni prima del salvataggio
        const sanitizedSections = (dto.sections || []).map(section => ({
            ...section,
            data: SanitizationUtils.sanitizeObjectData(section.data),
            timestamp: section.timestamp || new Date(),
            observations: section.observations || []
        }));

        const dossier = new Dossier({
            ...dto,
            owner: owner, // Forza l'owner dall'utente autenticato
            sections: sanitizedSections
        });

        return await dossier.save();
    }

    /**
     * Recupera un dossier per ID, verificando la proprietà.
     */
    async getDossierById(id: string): Promise<IDossier | null> {
        return await Dossier.findById(id);
    }

    /**
     * Elenca i dossier con filtri e paginazione, limitando la visibilità all'owner (se non admin).
     */
    async listDossiers(filters: any = {}, page: any = 1, pageSize: any = 20) {
        const safePage = sanitizePage(page);
        const safePageSize = sanitizePageSize(pageSize);
        const query: any = {};

        if (filters.status) query.status = filters.status;
        if (filters.owner) query.owner = filters.owner;
        if (filters.tags) query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
        if (filters.ip) query['sections.data.ip'] = filters.ip;

        if (filters.search && typeof filters.search === 'string') {
            const safeSearch = escapeRegex(filters.search.trim());
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } }
            ];
        }

        const total = await Dossier.countDocuments(query);
        const items = await Dossier.find(query)
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safePageSize)
            .limit(safePageSize);

        return { items, total, page: safePage, pageSize: safePageSize };
    }

    /**
     * Aggiorna un dossier esistente, verificando la proprietà.
     */
    async updateDossier(id: string, dto: UpdateDossierDTO, owner: string, isAdmin: boolean = false): Promise<IDossier | null> {
        const dossier = await Dossier.findById(id);
        if (!dossier) return null;

        // Verifica permessi: solo owner o admin possono modificare
        if (!isAdmin && dossier.owner !== owner) {
            this.logger.warn(`[DossierService] Tentativo di modifica non autorizzata del dossier ${id} da parte di ${owner}`);
            throw new Error('FORBIDDEN');
        }

        const updateData: any = { ...dto };
        // L'owner non può essere cambiato tramite update
        delete updateData.owner;

        if (dto.sections) {
            updateData.sections = dto.sections.map(section => ({
                ...section,
                data: SanitizationUtils.sanitizeObjectData(section.data),
                observations: section.observations || []
            }));
        }

        return await Dossier.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    }

    /**
     * Elimina un dossier, verificando la proprietà.
     */
    async deleteDossier(id: string, owner: string, isAdmin: boolean = false): Promise<boolean> {
        const dossier = await Dossier.findById(id);
        if (!dossier) return false;

        // Verifica permessi: solo owner o admin possono cancellare
        if (!isAdmin && dossier.owner !== owner) {
            this.logger.warn(`[DossierService] Tentativo di cancellazione non autorizzata del dossier ${id} da parte di ${owner}`);
            throw new Error('FORBIDDEN');
        }

        const result = await Dossier.findByIdAndDelete(id);
        return !!result;
    }

    /**
     * Genera un report (PDF o HTML) partendo da un dossier persistente, verificando la proprietà.
     */
    async generatePdfFromDossier(id: string, format: 'html' | 'pdf' = 'pdf', style: 'hud' | 'classic' | 'telex' = 'classic', locale: string): Promise<Buffer | string> {
        const dossier = await Dossier.findById(id);
        if (!dossier) throw new Error('Dossier not found');

        this.logger.info(`[DossierService] Generazione report per dossier salvato: ${id} [${style}/${format}]`);

        // Prepariamo le sezioni mappandole sul formato atteso dai generatori del ReportService
        const sections: IDossierSection[] = dossier.sections.map(s => ({
            templateKey: s.templateKey,
            data: s.data,
            type: s.type,
            timestamp: s.timestamp,
            renderedText: s.renderedText,
            order: s.order || 0,
            observations: s.observations || []
        }));

        if (style === 'hud') {
            return await this.reportService.generateHudReport(sections, locale, format);
        } else if (style === 'classic') {
            return await this.reportService.generateClassicReport(sections, locale, format);
        } else {
            return await this.reportService.generateTelexReport(sections, locale, format);
        }
    }
}
