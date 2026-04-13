import 'reflect-metadata';
import { DossierController } from '../controllers/DossierController';
import { DossierService } from '../services/DossierService';
import { Request, Response } from 'express';

describe('DossierController', () => {
    let dossierController: DossierController;
    let mockDossierService: jest.Mocked<DossierService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;
    let responseSend: jest.Mock;

    beforeEach(() => {
        mockDossierService = {
            createDossier: jest.fn(),
            getDossierById: jest.fn(),
            listDossiers: jest.fn(),
            updateDossier: jest.fn(),
            deleteDossier: jest.fn(),
            generatePdfFromDossier: jest.fn()
        } as any;

        dossierController = new DossierController(mockDossierService);

        responseJson = jest.fn();
        responseSend = jest.fn();
        responseStatus = jest.fn().mockReturnValue({ 
            json: responseJson,
            send: responseSend
        });
        mockResponse = {
            status: responseStatus,
            send: responseSend,
            setHeader: jest.fn().mockReturnThis(),
            json: responseJson
        };
        // Per rendere il mock funzionante con return res.status(200).json(...)
        (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    });

    describe('create()', () => {
        it('should return 201 and created dossier', async () => {
            const dto = { title: 'New Dossier', sections: [] };
            mockRequest = { body: dto };
            mockDossierService.createDossier.mockResolvedValue({ _id: '123', ...dto } as any);

            await dossierController.create(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(201);
            expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Dossier' }));
        });

        it('should return 400 if title is missing', async () => {
            mockRequest = { body: { sections: [] } };
            await dossierController.create(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(400);
        });

        it('should return 500 on service error', async () => {
            mockRequest = { body: { title: 'X', sections: [] } };
            mockDossierService.createDossier.mockRejectedValue(new Error('Fatal'));
            await dossierController.create(mockRequest as Request, mockResponse as Response);
            expect(responseStatus).toHaveBeenCalledWith(500);
        });
    });

    describe('list()', () => {
        it('should return 200 and list of dossiers', async () => {
            mockRequest = { query: { page: '1', pageSize: '10' } };
            mockDossierService.listDossiers.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

            await dossierController.list(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
        });
    });

    describe('getById()', () => {
        it('should return 200 if dossier exists', async () => {
            mockRequest = { params: { id: '123' } };
            mockDossierService.getDossierById.mockResolvedValue({ _id: '123', title: 'X' } as any);

            await dossierController.getById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ _id: '123' }));
        });

        it('should return 404 if dossier not found', async () => {
            mockRequest = { params: { id: '999' } };
            mockDossierService.getDossierById.mockResolvedValue(null);

            await dossierController.getById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
        });

        it('should return 500 if service throws error', async () => {
            mockRequest = { params: { id: '123' } };
            mockDossierService.getDossierById.mockRejectedValue(new Error('DB Error'));

            await dossierController.getById(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Operazione non riuscita' });
        });
    });

    describe('update()', () => {
        it('should return 200 and updated dossier', async () => {
            mockRequest = { params: { id: '123' }, body: { title: 'New' } };
            mockDossierService.updateDossier.mockResolvedValue({ _id: '123', title: 'New' } as any);

            await dossierController.update(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({ title: 'New' }));
        });

        it('should return 500 if service throws error', async () => {
            mockRequest = { params: { id: '123' }, body: { title: 'New' } };
            mockDossierService.updateDossier.mockRejectedValue(new Error('Update failed'));

            await dossierController.update(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Operazione non riuscita' });
        });
    });

    describe('delete()', () => {
        it('should return 204 (No Content) on success', async () => {
            mockRequest = { params: { id: '123' } };
            mockDossierService.deleteDossier.mockResolvedValue(true);

            await dossierController.delete(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(204);
        });

        it('should return 500 if service throws error', async () => {
            mockRequest = { params: { id: '123' } };
            mockDossierService.deleteDossier.mockRejectedValue(new Error('Delete failed'));

            await dossierController.delete(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Operazione non riuscita' });
        });
    });

    describe('export()', () => {
        it('should return 200 and PDF buffer on success', async () => {
            mockRequest = { params: { id: '123' }, query: { format: 'pdf', style: 'classic' } };
            const mockBuffer = Buffer.from('pdf');
            mockDossierService.generatePdfFromDossier.mockResolvedValue(mockBuffer as any);

            await dossierController.export(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
        });

        it('should return 200 and HTML string on success', async () => {
            mockRequest = { params: { id: '123' }, query: { format: 'html' } };
            mockDossierService.generatePdfFromDossier.mockResolvedValue('<html></html>');

            await dossierController.export(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.send).toHaveBeenCalledWith('<html></html>');
        });

        it('should return 500 if service throws error', async () => {
            mockRequest = { params: { id: '123' }, query: {} };
            mockDossierService.generatePdfFromDossier.mockRejectedValue(new Error('Export failed'));

            await dossierController.export(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Operazione non riuscita' });
        });
    });
});
