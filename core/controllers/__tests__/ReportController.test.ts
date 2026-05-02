import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { ReportController } from '../ReportController';
import { ReportService, ReportType } from '../../services/ReportService';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';
import { RouterHub } from '../../registry/RouterHub';

// Mock AuthMiddleware
jest.mock('../../middlewares/AuthMiddleware', () => {
    return {
        AuthMiddleware: jest.fn().mockImplementation(() => {
            return {
                isAuthenticated: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
                isIdentified: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
                hasRole: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
            };
        })
    };
});

// Mock del ReportService
const mockReportService = {
    generateDetailReport: jest.fn(),
    generateHudReport: jest.fn(),
    generateClassicReport: jest.fn(),
    generateTelexReport: jest.fn(),
};

// Mock AuthMiddleware
const mockAuthMiddleware = {
    isIdentified: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    isAuthenticated: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    hasRole: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
};

// Mocking container per iniettare il servizio fittizio
container.register<ReportService>(ReportService, { useValue: mockReportService as any });
container.register<AuthMiddleware>(AuthMiddleware, { useValue: mockAuthMiddleware as any });

const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = container.resolve(RouterHub);
hub.register(ReportController);
hub.bindHttp(app, container);

describe('ReportRoutes API', () => {

    beforeEach(() => {
        // Reset dei mock prima di ogni test
        jest.clearAllMocks();
    });

    describe('GET /api/reports/dettaglio', () => {

        it('should generate a PDF report for an IP attack successfully', async () => {
            const fakePdfBuffer = Buffer.from('fake-pdf-content');
            mockReportService.generateDetailReport.mockResolvedValue(fakePdfBuffer);

            const response = await request(app)
                .get('/api/reports/dettaglio')
                .query({ ip: '1.2.3.4', type: 'attack', format: 'pdf', locale: 'it-IT', style: 'classic' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toBe('attachment; filename=dossier_attack_1.2.3.4.pdf');
            expect(response.body).toEqual(fakePdfBuffer);
            expect(mockReportService.generateDetailReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'pdf', 'it-IT', 'classic', undefined);
        });

        it('should generate an HTML report for an IP attack successfully', async () => {
            const fakeHtml = '<html><body><h1>Test Report</h1></body></html>';
            mockReportService.generateDetailReport.mockResolvedValue(fakeHtml);

            const response = await request(app)
                .get('/api/reports/dettaglio')
                .query({ ip: '1.2.3.4', type: 'attack', format: 'html', locale: 'it-IT', style: 'classic' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.text).toBe(fakeHtml);
            expect(mockReportService.generateDetailReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'html', 'it-IT', 'classic', undefined);
        });

        it('should generate a PDF report for a telnet session successfully', async () => {
            const fakePdfBuffer = Buffer.from('fake-pdf-content-telnet');
            mockReportService.generateDetailReport.mockResolvedValue(fakePdfBuffer);

            const response = await request(app)
                .get('/api/reports/dettaglio')
                .query({ sessionId: 'session123', type: 'telnet', format: 'pdf', locale: 'en-US', style: 'hud' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toBe('attachment; filename=dossier_telnet_session123.pdf');
            expect(mockReportService.generateDetailReport).toHaveBeenCalledWith('telnet', 'session123', 'pdf', 'en-US', 'hud', undefined);
        });

        it('should return 400 if ID is not provided', async () => {
            const response = await request(app)
                .get('/api/reports/dettaglio')
                .query({ type: 'attack' }); // ip o sessionId mancante

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('È necessario fornire un ID o una lista IP valida per il tipo attack');
            expect(mockReportService.generateDetailReport).not.toHaveBeenCalled();
        });

        it('should return 500 if report generation fails', async () => {
            const errorMessage = 'Internal Server Error';
            mockReportService.generateDetailReport.mockRejectedValue(new Error(errorMessage));

            const response = await request(app)
                .get('/api/reports/dettaglio')
                .query({ ip: '1.2.3.4' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Errore durante la generazione del report');
        });

        it('should use default report type and format if not provided', async () => {
            const fakePdfBuffer = Buffer.from('default-case-pdf');
            mockReportService.generateDetailReport.mockResolvedValue(fakePdfBuffer);

            await request(app)
                .get('/api/reports/dettaglio')
                .query({ ip: '1.2.3.4' });

            // 'attack' è il tipo di default, 'pdf' è il formato di default, 'it-IT' locale, 'classic' stile
            expect(mockReportService.generateDetailReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'pdf', 'it-IT', 'classic', undefined);
        });

    });

});
