import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import Dossier, { IDossier, DossierStatus, IDossierSection } from '../models/DossierSchema';
import { CreateDossierDTO, UpdateDossierDTO, DossierResponseDTO } from '../models/dto/DossierDTO';
import { ReportService } from './ReportService';

@injectable()
export class DossierService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly reportService: ReportService
    ) {}

    /**
     * Crea un nuovo Dossier sanificando i dati delle sezioni.
     */
    async createDossier(dto: CreateDossierDTO): Promise<IDossier> {
        this.logger.info(`[DossierService] Creazione nuovo dossier: ${dto.title}`);
        
        // Sanificazione profonda di tutte le sezioni prima del salvataggio
        const sanitizedSections = (dto.sections || []).map(section => ({
            ...section,
            data: this.sanitizeSectionData(section.data),
            timestamp: section.timestamp || new Date()
        }));

        const dossier = new Dossier({
            ...dto,
            sections: sanitizedSections
        });

        return await dossier.save();
    }

    /**
     * Recupera un dossier per ID.
     */
    async getDossierById(id: string): Promise<IDossier | null> {
        return await Dossier.findById(id);
    }

    /**
     * Elenca i dossier con filtri e paginazione.
     */
    async listDossiers(filters: any = {}, page: number = 1, pageSize: number = 20) {
        const query: any = {};
        
        if (filters.status) query.status = filters.status;
        if (filters.owner) query.owner = filters.owner;
        if (filters.tags) query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
        if (filters.ip) query['sections.data.ip'] = filters.ip;
        
        if (filters.search) {
            query.$or = [
                { title: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const total = await Dossier.countDocuments(query);
        const items = await Dossier.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        return { items, total, page, pageSize };
    }

    /**
     * Aggiorna un dossier esistente.
     */
    async updateDossier(id: string, dto: UpdateDossierDTO): Promise<IDossier | null> {
        const updateData: any = { ...dto };
        
        if (dto.sections) {
            updateData.sections = dto.sections.map(section => ({
                ...section,
                data: this.sanitizeSectionData(section.data)
            }));
        }

        return await Dossier.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    }

    /**
     * Elimina un dossier.
     */
    async deleteDossier(id: string): Promise<boolean> {
        const result = await Dossier.findByIdAndDelete(id);
        return !!result;
    }

    /**
     * Genera un report (PDF o HTML) partendo da un dossier persistente.
     */
    async generatePdfFromDossier(id: string, format: 'html' | 'pdf' = 'pdf', style: 'hud' | 'classic' | 'telex' = 'classic', locale: string): Promise<Buffer | string> {
        const dossier = await this.getDossierById(id);
        if (!dossier) throw new Error('Dossier not found');

        this.logger.info(`[DossierService] Generazione report per dossier salvato: ${id} [${style}/${format}]`);

        // Prepariamo le sezioni mappandole sul formato atteso dai generatori del ReportService
        const sections: IDossierSection[] = dossier.sections.map(s => ({
            templateKey: s.templateKey,
            data: s.data,
            type: s.type,
            timestamp: s.timestamp,
            renderedText: s.renderedText,
            order: s.order || 0
        }));

        if (style === 'hud') {
            return await this.reportService.generateHudReport(sections, locale, format);
        } else if (style === 'classic') {
            return await this.reportService.generateClassicReport(sections, locale, format);
        } else {
            return await this.reportService.generateCustomReport(sections, locale, format);
        }
    }

    /**
     * Sanifica ricorsivamente un oggetto data per pulire campi raw.
     * Logica derivata dal ReportService per coerenza.
     */
    private sanitizeSectionData(data: Record<string, any>): Record<string, any> {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        const fieldsToSanitize = ['whois', 'rawData', 'payload', 'comment', 'input'];
        
        for (const key of Object.keys(sanitized)) {
            if (fieldsToSanitize.includes(key) && typeof sanitized[key] === 'string') {
                sanitized[key] = this.sanitizeRawString(sanitized[key]);
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeSectionData(sanitized[key]);
            }
        }
        
        return sanitized;
    }

    private sanitizeRawString(input: string): string {
        if (!input) return input;
        let sanitized = input.trim();
        
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            try {
                return JSON.parse(sanitized);
            } catch (e) {
                sanitized = sanitized.slice(1, -1);
            }
        }
        
        return sanitized
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t');
    }
}
