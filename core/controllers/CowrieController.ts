import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { CowrieService } from '../services/CowrieService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class CowrieController {
    constructor(
        private cowrieService: CowrieService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

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
            res.status(500).json({ error: 'Failed to fetch telnet sessions.' });
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
            res.status(500).json({ error: 'Failed to search telnet sessions.' });
        }
    }

    // GET /api/cowrie/sessions/:id
    async getSessionDetails(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const session = await this.cowrieService.getSessionDetails(id);
            if (!session) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }
            res.status(200).json(session);
        } catch (error: any) {
            this.logger.error(`[CowrieController] Error in getSessionDetails: ${error.message}`);
            res.status(500).json({ error: 'Failed to fetch telnet session details.' });
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
            res.status(500).json({ error: 'Failed to fetch telnet events.' });
        }
    }
}
