import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CowrieService } from '../services/CowrieService';
import { I18nService } from '../services/I18nService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class CowrieController {
    constructor(
        private cowrieService: CowrieService,
        @inject(I18nService) private i18n: I18nService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}
    
    private getLocale(req: Request): string {
        return (req.query.locale as string) || 
               (req.headers['x-locale'] as string) || 
               (req.headers['accept-language']?.split(',')[0]?.split(';')[0]) || 
               'it-IT';
    }

    // GET /api/cowrie/sessions
    async getSessions(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const sortStr = req.query.sort as string;
            const filtersStr = req.query.filters as string;

            let sortFields: Record<string, any> = { timestamp: -1 };
            let filters: any = {};

            if (sortStr) {
                try {
                    sortFields = JSON.parse(sortStr);
                } catch (e) {
                    this.logger.warn(`[CowrieController] Failed to parse sort query: ${sortStr}`);
                }
            }

            if (filtersStr) {
                try {
                    filters = JSON.parse(filtersStr);
                } catch (e) {
                    this.logger.warn(`[CowrieController] Failed to parse filters query: ${filtersStr}`);
                }
            }

            const { sessions, totalCount } = await this.cowrieService.getSessions(page, pageSize, sortFields, filters);

            res.status(200).json({
                sessions,
                total: totalCount,
                page,
                pageSize
            });
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessions: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }

    // POST /api/cowrie/search
    async searchSessions(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const pageSize = parseInt(req.body.pageSize as string) || 20;
            const sortFields = req.body.sortFields || { timestamp: -1 };
            const filters = req.body.filters || {};

            const { sessions, totalCount } = await this.cowrieService.getSessions(page, pageSize, sortFields, filters);

            res.status(200).json({
                sessions,
                total: totalCount,
                page,
                pageSize
            });
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in searchSessions: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.searchError', locale) });
        }
    }

    // GET /api/cowrie/sessions/:id
    async getSessionDetails(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const session = await this.cowrieService.getSessionDetails(id);
            if (!session) {
                const locale = this.getLocale(req);
                res.status(404).json({ error: this.i18n.t('errors.system.notFound', locale) });
                return;
            }
            res.status(200).json(session);
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessionDetails: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }

    // GET /api/cowrie/sessions/:id/events
    async getSessionEvents(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const events = await this.cowrieService.getSessionEvents(id);
            res.status(200).json(events);
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessionEvents: ${error.message}`);
            const locale = this.getLocale(req);
            res.status(500).json({ error: this.i18n.t('errors.system.fetchError', locale) });
        }
    }
}
