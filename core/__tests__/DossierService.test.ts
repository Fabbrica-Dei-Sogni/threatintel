import 'reflect-metadata';
import { DossierService } from '../services/DossierService';
import Dossier, { DossierStatus } from '../models/DossierSchema';

// Mock del modello Mongoose
jest.mock('../models/DossierSchema');

describe('DossierService', () => {
    let dossierService: DossierService;
    let mockLogger: any;
    let mockReportService: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockReportService = {
            generateHudReport: jest.fn(),
            generateClassicReport: jest.fn(),
            generateTelexReport: jest.fn(),
            generateCustomReport: jest.fn()
        };

        dossierService = new DossierService(mockLogger, mockReportService);
    });

    describe('createDossier()', () => {
        it('should create a dossier with sanitized sections and assigned owner', async () => {
            const mockDto = {
                title: 'Test Dossier',
                sections: [
                    {
                        type: 'ip',
                        templateKey: 'test.key',
                        data: { whois: '"Record con \\n newlines"', ip: '1.2.3.4' },
                        order: 0,
                        timestamp: new Date()
                    }
                ]
            };

            const saveSpy = jest.fn().mockResolvedValue({ _id: '123', ...mockDto });
            (Dossier as unknown as jest.Mock).mockImplementation(() => ({
                save: saveSpy
            }));

            const result = await dossierService.createDossier(mockDto as any, 'user1');

            expect(Dossier).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
            
            const savedData = (Dossier as unknown as jest.Mock).mock.calls[0][0];
            expect(savedData.owner).toBe('user1');
            expect(savedData.sections[0].data.whois).toBe('Record con \n newlines');
            expect(savedData.sections[0].observations).toEqual([]);
        });
    });

    describe('listDossiers()', () => {
        it('should return all dossiers regardless of owner (public read)', async () => {
            const mockItems = [{ title: 'Dossier 1', owner: 'user1' }, { title: 'Dossier 2', owner: 'user2' }];
            (Dossier.countDocuments as jest.Mock).mockResolvedValue(2);
            (Dossier.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockItems)
            });

            const result = await dossierService.listDossiers({ status: DossierStatus.DRAFT }, 1, 10);

            expect(result.items).toHaveLength(2);
            expect(Dossier.find).toHaveBeenCalledWith(expect.objectContaining({ 
                status: DossierStatus.DRAFT
            }));
            // Verifica che NON ci sia il filtro per owner
            const query = (Dossier.find as jest.Mock).mock.calls[0][0];
            expect(query.owner).toBeUndefined();
        });

        it('should allow filtering by owner explicitly', async () => {
            (Dossier.countDocuments as jest.Mock).mockResolvedValue(0);
            (Dossier.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            });

            await dossierService.listDossiers({ owner: 'target_user' });

            expect(Dossier.find).toHaveBeenCalledWith(expect.objectContaining({
                owner: 'target_user'
            }));
        });
    });

    describe('getDossierById()', () => {
        it('should return dossier regardless of owner (public read)', async () => {
            const mockDossier = { _id: '123', title: 'Found', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);

            const result = await dossierService.getDossierById('123');
            expect(result).toEqual(mockDossier);
            expect(Dossier.findById).toHaveBeenCalledWith('123');
        });

        it('should return null if not found', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(null);
            const result = await dossierService.getDossierById('999');
            expect(result).toBeNull();
        });
    });

    describe('updateDossier()', () => {
        it('should update if user is owner', async () => {
            const mockDossier = { _id: '123', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            (Dossier.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockDossier, title: 'Updated' });

            const result = await dossierService.updateDossier('123', { title: 'Updated' }, 'user1', false);
            expect(result?.title).toBe('Updated');
        });

        it('should update if user is admin even if not owner', async () => {
            const mockDossier = { _id: '123', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            (Dossier.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockDossier, title: 'AdminUpdate' });

            const result = await dossierService.updateDossier('123', { title: 'AdminUpdate' }, 'admin_user', true);
            expect(result?.title).toBe('AdminUpdate');
        });

        it('should throw FORBIDDEN if user is not owner and not admin', async () => {
            const mockDossier = { _id: '123', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);

            await expect(dossierService.updateDossier('123', { title: 'Hack' }, 'user2', false))
                .rejects.toThrow('FORBIDDEN');
        });
    });

    describe('deleteDossier()', () => {
        it('should delete if user is owner', async () => {
            const mockDossier = { _id: '123', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            (Dossier.findByIdAndDelete as jest.Mock).mockResolvedValue(mockDossier);

            const result = await dossierService.deleteDossier('123', 'user1', false);
            expect(result).toBe(true);
        });

        it('should throw FORBIDDEN if user is not owner and not admin', async () => {
            const mockDossier = { _id: '123', owner: 'user1' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);

            await expect(dossierService.deleteDossier('123', 'user2', false))
                .rejects.toThrow('FORBIDDEN');
        });
    });

    describe('generatePdfFromDossier()', () => {
        const mockDossier = {
            _id: '123',
            owner: 'user1',
            sections: [{ templateKey: 'k', data: {}, type: 'ip', timestamp: new Date(), order: 0 }]
        };

        it('should generate report regardless of requester (public read)', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            mockReportService.generateClassicReport.mockResolvedValue('pdf-buffer');

            const result = await dossierService.generatePdfFromDossier('123', 'pdf', 'classic', 'it-IT');

            expect(result).toBe('pdf-buffer');
            expect(Dossier.findById).toHaveBeenCalledWith('123');
        });

        it('should throw error if dossier not found', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(null);
            await expect(dossierService.generatePdfFromDossier('999', 'pdf', 'classic', 'it-IT'))
                .rejects.toThrow('Dossier not found');
        });
    });
});
