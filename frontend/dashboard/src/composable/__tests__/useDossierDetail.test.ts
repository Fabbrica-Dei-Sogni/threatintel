import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDossierDetail } from '../useDossierDetail';
import { setActivePinia, createPinia } from 'pinia';
import * as api from '../../api/index';
import { useAuthStore } from '../../stores/auth';
import { DossierSectionType } from '../../models/DossierDTO';

vi.mock('../../api/index', () => ({
  fetchDossierById: vi.fn(),
  updateDossier: vi.fn(),
  deleteDossier: vi.fn(),
  exportDossier: vi.fn()
}));

describe('useDossierDetail', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should load dossier details successfully', async () => {
    const mockDossier = { id: '123', title: 'Test Dossier', sections: [] };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier);

    const { dossier, loadDossier, loading } = useDossierDetail();
    
    await loadDossier('123');

    expect(loading.value).toBe(false);
    expect(dossier.value).toEqual(mockDossier);
    expect(api.fetchDossierById).toHaveBeenCalledWith('123');
  });

  it('should handle error when loading fails', async () => {
    vi.mocked(api.fetchDossierById).mockRejectedValue(new Error('Fail'));

    const { error, loadDossier } = useDossierDetail();
    try {
        await loadDossier('123');
    } catch (e) {}

    expect(error.value).toBeTruthy();
  });

  it('should update dossier metadata', async () => {
    const mockDossier = { id: '123', title: 'Old', description: 'desc', sections: [] };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier, title: 'New' });

    const { dossier, loadDossier, saveMetadata } = useDossierDetail();
    await loadDossier('123');
    
    await saveMetadata('123', { title: 'New', description: 'desc' });

    expect(api.updateDossier).toHaveBeenCalledWith('123', expect.objectContaining({ title: 'New' }));
    expect(dossier.value!.title).toBe('New');
  });

  it('should add a human section', async () => {
    const mockDossier = { id: '123', sections: [] };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier, sections: [{ type: DossierSectionType.HUMAN }] } as any);

    const { loadDossier, addHumanSection, dossier } = useDossierDetail();
    await loadDossier('123');
    await addHumanSection('123');

    expect(api.updateDossier).toHaveBeenCalled();
    expect(dossier.value!.sections[0].type).toBe(DossierSectionType.HUMAN);
  });

  it('should update a section', async () => {
    const mockDossier = { id: '123', sections: [{ id: 's1', type: 'generic', data: {} }] };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier, sections: [{ id: 's1', type: 'generic', data: { updated: true } }] } as any);

    const { loadDossier, updateSection, dossier } = useDossierDetail();
    await loadDossier('123');
    await updateSection('123', 0, { data: { updated: true } });

    expect(api.updateDossier).toHaveBeenCalled();
    expect((dossier.value!.sections[0].data as any).updated).toBe(true);
  });

  it('should delete a section', async () => {
    const mockDossier = { id: '123', sections: [{ id: 's1', type: 'generic' }] };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier, sections: [] } as any);

    const { loadDossier, deleteSection, dossier } = useDossierDetail();
    await loadDossier('123');
    await deleteSection('123', 0);

    expect(dossier.value!.sections).toHaveLength(0);
  });

  it('should add an observation to a section', async () => {
    const mockDossier = { 
        id: '123', 
        sections: [{ id: 's1', type: 'generic', observations: [] }] 
    };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier } as any);

    const { loadDossier, addObservation, dossier } = useDossierDetail();
    await loadDossier('123');
    await addObservation('123', 0, 'New Note');

    expect(dossier.value!.sections[0].observations).toContain('New Note');
  });

  it('should update and delete an observation', async () => {
    const mockDossier = { 
        id: '123', 
        sections: [{ id: 's1', type: 'generic', observations: ['Note 1'] }] 
    };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier } as any);

    const { loadDossier, updateObservation, deleteObservation, dossier } = useDossierDetail();
    await loadDossier('123');
    
    // Update
    await updateObservation('123', 0, 0, 'Updated Note');
    expect(dossier.value!.sections[0].observations![0]).toBe('Updated Note');

    // Delete
    await deleteObservation('123', 0, 0);
    expect(dossier.value!.sections[0].observations).toHaveLength(0);
  });

  it('should determine if user can modify dossier', () => {
    const authStore = useAuthStore();
    const { dossier, canModify } = useDossierDetail();

    // Not loaded
    expect(canModify.value).toBe(false);

    dossier.value = { id: '123', owner: 'admin', title: 'T', sections: [] } as any;
    
    // Not logged in
    authStore.user = null;
    expect(canModify.value).toBe(false);

    // Logged in as owner
    authStore.user = { username: 'admin' } as any;
    expect(canModify.value).toBe(true);

    // Logged in as other user, not admin
    authStore.user = { username: 'other', roles: [{ name: 'user' }] } as any;
    expect(canModify.value).toBe(false);

    // Logged in as other user, but is admin
    authStore.user = { username: 'other', roles: [{ name: 'admin' }] } as any;
    expect(canModify.value).toBe(true);
  });

  it('should sort sections correctly (human first, then by date)', async () => {
    const mockDossier = { 
        id: '123', 
        sections: [
            { id: 's1', type: DossierSectionType.GENERIC, timestamp: '2023-01-01T10:00:00Z' },
            { id: 's2', type: DossierSectionType.HUMAN, timestamp: '2023-01-01T09:00:00Z' },
            { id: 's3', type: DossierSectionType.GENERIC, timestamp: '2023-01-01T11:00:00Z' }
        ] 
    };
    vi.mocked(api.fetchDossierById).mockResolvedValue(mockDossier as any);
    vi.mocked(api.updateDossier).mockResolvedValue({ ...mockDossier } as any);

    const { loadDossier, dossier, updateSection } = useDossierDetail();
    await loadDossier('123');
    
    // Trigger a sort by updating something
    await updateSection('123', 0, {});

    // Expected order: s2 (human), s3 (newest generic), s1 (oldest generic)
    expect(dossier.value!.sections[0].id).toBe('s2');
    expect(dossier.value!.sections[1].id).toBe('s3');
    expect(dossier.value!.sections[2].id).toBe('s1');
  });
});
