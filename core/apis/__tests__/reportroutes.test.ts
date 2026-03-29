import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { ReportController } from '../../controllers/ReportController';
import { ReportService, ReportType } from '../../services/ReportService';
import reportRoutes from '../reportroutes';

// Mock del ReportService
const mockReportService = {
    generateReport: jest.fn(),
};

// Mocking container per iniettare il servizio fittizio
container.register<ReportService>(ReportService, { useValue: mockReportService as any });

// Creazione dell'istanza del controller con il servizio mockato
const reportController = new ReportController(mockReportService as any);

const app = express();
app.use(express.json());
app.use('/', reportRoutes(reportController));

describe('ReportRoutes API', () => {

    beforeEach(() => {
        // Reset dei mock prima di ogni test
        jest.clearAllMocks();
    });

    describe('GET /api/reports/attack', () => {

        it('should generate a PDF report for an IP attack successfully', async () => {
            const fakePdfBuffer = Buffer.from('fake-pdf-content');
            mockReportService.generateReport.mockResolvedValue(fakePdfBuffer);

            const response = await request(app)
                .get('/api/reports/attack')
                .query({ ip: '1.2.3.4', type: 'attack', format: 'pdf' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toBe('attachment; filename=dossier_attack_1.2.3.4.pdf');
            expect(response.body).toEqual(fakePdfBuffer);
            expect(mockReportService.generateReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'pdf');
        });

        it('should generate an HTML report for an IP attack successfully', async () => {
            const fakeHtml = '<html><body><h1>Test Report</h1></body></html>';
            mockReportService.generateReport.mockResolvedValue(fakeHtml);

            const response = await request(app)
                .get('/api/reports/attack')
                .query({ ip: '1.2.3.4', type: 'attack', format: 'html' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.text).toBe(fakeHtml);
            expect(mockReportService.generateReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'html');
        });

        it('should generate a PDF report for a telnet session successfully', async () => {
            const fakePdfBuffer = Buffer.from('fake-pdf-content-telnet');
            mockReportService.generateReport.mockResolvedValue(fakePdfBuffer);

            const response = await request(app)
                .get('/api/reports/attack')
                .query({ sessionId: 'session123', type: 'telnet', format: 'pdf' });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toBe('attachment; filename=dossier_telnet_session123.pdf');
            expect(mockReportService.generateReport).toHaveBeenCalledWith('telnet', 'session123', 'pdf');
        });

        it('should return 400 if ID is not provided', async () => {
            const response = await request(app)
                .get('/api/reports/attack')
                .query({ type: 'attack' }); // ip o sessionId mancante

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('È necessario fornire un ID valido per il tipo attack');
            expect(mockReportService.generateReport).not.toHaveBeenCalled();
        });

        it('should return 500 if report generation fails', async () => {
            const errorMessage = 'Internal Server Error';
            mockReportService.generateReport.mockRejectedValue(new Error(errorMessage));

            const response = await request(app)
                .get('/api/reports/attack')
                .query({ ip: '1.2.3.4' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe(errorMessage);
        });

        it('should use default report type and format if not provided', async () => {
            const fakePdfBuffer = Buffer.from('default-case-pdf');
            mockReportService.generateReport.mockResolvedValue(fakePdfBuffer);

            await request(app)
                .get('/api/reports/attack')
                .query({ ip: '1.2.3.4' });

            // 'attack' è il tipo di default, 'pdf' è il formato di default
            expect(mockReportService.generateReport).toHaveBeenCalledWith('attack', '1.2.3.4', 'pdf');
        });

    });

});
