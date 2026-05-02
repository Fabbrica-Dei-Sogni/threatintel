/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';
import { ReportController } from '../controllers/ReportController';
import { Request, Response } from 'express';

describe('ReportController', () => {
    let reportController: ReportController;
    let mockReportService: any;
    let mockRes: any;
    let mockReq: any;

    beforeEach(() => {
        mockReportService = {
            generateDetailReport: jest.fn(),
            generateHudReport: jest.fn(),
            generateClassicReport: jest.fn(),
            generateTelexReport: jest.fn(),
        };
        reportController = new ReportController(mockReportService);
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };
    });

    describe('generateDetailReport', () => {
        it('should return 400 if ID (ip/sessionId) is missing', async () => {
            mockReq = { query: { type: 'attack' } };
            await reportController.generateDetailReport(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should call generateDetailReport and send PDF', async () => {
            const buffer = Buffer.from('pdf');
            mockReq = { query: { ip: '1.1.1.1', type: 'attack' } };
            mockReportService.generateDetailReport.mockResolvedValue(buffer);

            await reportController.generateDetailReport(mockReq as Request, mockRes as Response);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(mockRes.send).toHaveBeenCalledWith(buffer);
        });

        it('should handle HTML format', async () => {
            mockReq = { query: { ip: '1.1.1.1', format: 'html' } };
            mockReportService.generateDetailReport.mockResolvedValue('<html></html>');

            await reportController.generateDetailReport(mockReq as Request, mockRes as Response);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
            expect(mockRes.send).toHaveBeenCalledWith('<html></html>');
        });

        it('should handle errors with 500', async () => {
            mockReq = { query: { ip: '1.1.1.1' } };
            mockReportService.generateDetailReport.mockRejectedValue(new Error('fail'));

            await reportController.generateDetailReport(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('generateCustomReport', () => {
        it('should return 400 if sections are missing', async () => {
            mockReq = { body: {}, query: {} };
            await reportController.generateCustomReport(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should call generateHudReport when style is hud', async () => {
            mockReq = { body: { sections: [], locale: 'it-IT' }, query: { style: 'hud' } };
            mockReportService.generateHudReport.mockResolvedValue(Buffer.from('hud-pdf'));

            await reportController.generateCustomReport(mockReq as Request, mockRes as Response);

            expect(mockReportService.generateHudReport).toHaveBeenCalled();
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        });

        it('should call generateClassicReport when style is classic', async () => {
            mockReq = { body: { sections: [], locale: 'it-IT' }, query: { style: 'classic' } };
            mockReportService.generateClassicReport.mockResolvedValue(Buffer.from('classic-pdf'));

            await reportController.generateCustomReport(mockReq as Request, mockRes as Response);

            expect(mockReportService.generateClassicReport).toHaveBeenCalled();
        });

        it('should call generateTelexReport by default', async () => {
            mockReq = { body: { sections: [], locale: 'it-IT' }, query: { style: 'telex' } };
            mockReportService.generateTelexReport.mockResolvedValue(Buffer.from('telex-pdf'));

            await reportController.generateCustomReport(mockReq as Request, mockRes as Response);

            expect(mockReportService.generateTelexReport).toHaveBeenCalled();
        });

        it('should handle HTML format in custom report', async () => {
            mockReq = { body: { sections: [], locale: 'it-IT' }, query: { format: 'html' } };
            mockReportService.generateClassicReport.mockResolvedValue('<html></html>');

            await reportController.generateCustomReport(mockReq as Request, mockRes as Response);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
            expect(mockRes.send).toHaveBeenCalledWith('<html></html>');
        });
    });
});
