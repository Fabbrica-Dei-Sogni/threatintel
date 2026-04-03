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
            generateCustomReport: jest.fn()
        };

        dossierService = new DossierService(mockLogger, mockReportService);
    });

    describe('createDossier()', () => {
        it('should create a dossier with sanitized sections', async () => {
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

            const result = await dossierService.createDossier(mockDto as any);

            expect(Dossier).toHaveBeenCalled();
            expect(saveSpy).toHaveBeenCalled();
            
            // Verifica sanificazione (il campo whois nel mockDto aveva virgolette doppie e \n letterale)
            const savedData = (Dossier as unknown as jest.Mock).mock.calls[0][0];
            expect(savedData.sections[0].data.whois).toBe('Record con \n newlines');
            expect(savedData.sections[0].observations).toEqual([]);
        });

        it('should preserve provided observations', async () => {
            const mockDto = {
                title: 'Test Dossier',
                sections: [{ type: 'ip', data: {}, observations: ['note1'] }]
            };
            const saveSpy = jest.fn().mockResolvedValue({ _id: '123', ...mockDto });
            (Dossier as unknown as jest.Mock).mockImplementation(() => ({ save: saveSpy }));

            await dossierService.createDossier(mockDto as any);
            const savedData = (Dossier as unknown as jest.Mock).mock.calls[0][0];
            expect(savedData.sections[0].observations).toEqual(['note1']);
        });
    });

    describe('listDossiers()', () => {
        it('should return paginated dossiers with filters', async () => {
            const mockItems = [{ title: 'Dossier 1' }, { title: 'Dossier 2' }];
            (Dossier.countDocuments as jest.Mock).mockResolvedValue(2);
            (Dossier.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockItems)
            });

            const result = await dossierService.listDossiers({ status: DossierStatus.DRAFT }, 1, 10);

            expect(result.items).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(Dossier.find).toHaveBeenCalledWith(expect.objectContaining({ status: DossierStatus.DRAFT }));
        });

        it('should apply search filter correctly', async () => {
            (Dossier.countDocuments as jest.Mock).mockResolvedValue(0);
            (Dossier.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            });

            await dossierService.listDossiers({ search: 'term' });

            expect(Dossier.find).toHaveBeenCalledWith(expect.objectContaining({
                $or: expect.arrayContaining([
                    { title: { $regex: 'term', $options: 'i' } }
                ])
            }));
        });

        it('should apply owner, tags and ip filters', async () => {
            (Dossier.countDocuments as jest.Mock).mockResolvedValue(0);
            (Dossier.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            });

            await dossierService.listDossiers({ owner: 'user1', tags: ['t1'], ip: '1.1.1.1' });

            expect(Dossier.find).toHaveBeenCalledWith(expect.objectContaining({
                owner: 'user1',
                tags: { $in: ['t1'] },
                'sections.data.ip': '1.1.1.1'
            }));
        });
    });

    describe('getDossierById()', () => {
        it('should return dossier if found', async () => {
            const mockDossier = { _id: '123', title: 'Found' };
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);

            const result = await dossierService.getDossierById('123');
            expect(result).toEqual(mockDossier);
        });

        it('should return null if not found', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(null);
            const result = await dossierService.getDossierById('999');
            expect(result).toBeNull();
        });
    });

    describe('updateDossier()', () => {
        it('should update and return the dossier', async () => {
            const mockUpdated = { _id: '123', title: 'Updated' };
            (Dossier.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await dossierService.updateDossier('123', { title: 'Updated' });
            expect(result).toEqual(mockUpdated);
            expect(Dossier.findByIdAndUpdate).toHaveBeenCalledWith(
                '123',
                expect.objectContaining({ $set: { title: 'Updated' } }),
                { new: true }
            );
        });

        it('should sanitize and include observations in section update', async () => {
            const mockSections = [{ type: 'ip', data: { x: 'y' }, observations: ['obs1'] }];
            (Dossier.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            await dossierService.updateDossier('123', { sections: mockSections as any });

            const updateCall = (Dossier.findByIdAndUpdate as jest.Mock).mock.calls[0][1].$set;
            expect(updateCall.sections[0].observations).toEqual(['obs1']);
            expect(updateCall.sections[0].data.x).toBe('y');
        });
    });

    describe('deleteDossier()', () => {
        it('should return true on successful deletion', async () => {
            (Dossier.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: '123' });
            const result = await dossierService.deleteDossier('123');
            expect(result).toBe(true);
        });

        it('should return false if dossier does not exist', async () => {
            (Dossier.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
            const result = await dossierService.deleteDossier('999');
            expect(result).toBe(false);
        });
    });

    describe('generatePdfFromDossier()', () => {
        const mockDossier = {
            _id: '123',
            sections: [
                { templateKey: 'k', data: {}, type: 'ip', timestamp: new Date(), renderedText: 'txt' }
            ]
        };

        it('should call generateHudReport when style is hud', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            mockReportService.generateHudReport.mockResolvedValue('pdf-buffer');

            const result = await dossierService.generatePdfFromDossier('123', 'pdf', 'hud', 'it-IT');

            expect(result).toBe('pdf-buffer');
            expect(mockReportService.generateHudReport).toHaveBeenCalled();
        });

        it('should call generateClassicReport when style is classic', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(mockDossier);
            mockReportService.generateClassicReport.mockResolvedValue('pdf-buffer');

            await dossierService.generatePdfFromDossier('123', 'pdf', 'classic', 'it-IT');

            expect(mockReportService.generateClassicReport).toHaveBeenCalled();
        });

        it('should throw error if dossier not found', async () => {
            (Dossier.findById as jest.Mock).mockResolvedValue(null);
            await expect(dossierService.generatePdfFromDossier('999', 'pdf', 'hud', 'it-IT'))
                .rejects.toThrow('Dossier not found');
        });

        it('should call generateTelexReport for other styles', async () => {
            const dossierWithObs = {
                ...mockDossier,
                sections: [{ ...mockDossier.sections[0], observations: ['note'] }]
            };
            (Dossier.findById as jest.Mock).mockResolvedValue(dossierWithObs);
            mockReportService.generateTelexReport.mockResolvedValue('telex-buffer');

            const result = await dossierService.generatePdfFromDossier('123', 'pdf', 'telex', 'it-IT');

            expect(result).toBe('telex-buffer');
            const sectionsPassed = mockReportService.generateTelexReport.mock.calls[0][0];
            expect(sectionsPassed[0].observations).toEqual(['note']);
        });
    });
});
