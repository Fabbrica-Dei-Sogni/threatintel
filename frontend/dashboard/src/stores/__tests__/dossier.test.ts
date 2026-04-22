import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDossierStore } from '../dossier';
import * as api from '../../api/index';

vi.mock('../../api/index', () => ({
  saveDossier: vi.fn()
}));

describe('DossierStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with values from localStorage', () => {
    const mockSession = JSON.stringify({
        isRecording: true,
        isEnabled: false,
        sections: [{ id: '1', templateKey: 'tk', type: 'generic' }],
        clipboardBuffer: 'old-buffer'
    });
    localStorage.setItem('custom_dossier_session', mockSession);
    
    const store = useDossierStore();
    expect(store.isRecording).toBe(true);
    expect(store.isEnabled).toBe(false);
    expect(store.sections).toHaveLength(1);
    expect(store.clipboardBuffer).toBe('old-buffer');
  });

  it('should handle corrupted localStorage', () => {
    localStorage.setItem('custom_dossier_session', 'invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const store = useDossierStore();
    expect(store.sections).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should start and stop recording', () => {
    const store = useDossierStore();
    expect(store.isRecording).toBe(false);
    
    store.startRecording();
    expect(store.isRecording).toBe(true);
    
    store.stopRecording();
    expect(store.isRecording).toBe(false);
  });

  it('should add sections with correct types when recording', () => {
    const store = useDossierStore();
    store.startRecording();
    
    store.addSection('ipDetails.title', {}, 'ip text');
    expect(store.sections[0].type).toBe('ip');

    store.addSection('attackDetail.rateLimitEvent', {}, 'rate text');
    expect(store.sections[1].type).toBe('rate_breach');

    store.addSection('attackDetail.other', {}, 'attack text');
    expect(store.sections[2].type).toBe('attack');

    store.addSection('telnetDetail.events', {}, 'telnet text');
    expect(store.sections[3].type).toBe('telnet');

    store.addSection('some.generic', {}, 'gen text');
    expect(store.sections[4].type).toBe('generic');
    
    expect(store.sections.length).toBe(5);
    expect(store.clipboardBuffer).toContain('ip text\n\nrate text');
  });

  it('should remove a section', () => {
    const store = useDossierStore();
    store.isRecording = true;
    store.addSection('t1', {}, 'text1');
    const id = store.sections[0].id;
    
    store.removeSection(id);
    expect(store.sections).toHaveLength(0);
  });

  it('should reset correctly', () => {
    const store = useDossierStore();
    store.startRecording();
    store.addSection('test', {}, 'text');
    
    store.reset();
    expect(store.sections.length).toBe(0);
    expect(store.isRecording).toBe(false);
    expect(store.clipboardBuffer).toBe('');
    expect(localStorage.getItem('custom_dossier_session')).toBeNull();
  });

  it('should persist to DB', async () => {
    const store = useDossierStore();
    store.startRecording();
    store.addSection('test', {}, 'text');
    
    vi.mocked(api.saveDossier).mockResolvedValue({ id: 'dossier-id' });

    const result = await store.persistToDb('My Dossier', 'Description', ['tag1']);
    
    expect(api.saveDossier).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Dossier',
      tags: ['tag1']
    }));
    expect(result.id).toBe('dossier-id');
  });

  it('should not persist to DB if no sections', async () => {
    const store = useDossierStore();
    const result = await store.persistToDb('Empty');
    expect(result).toBeUndefined();
    expect(api.saveDossier).not.toHaveBeenCalled();
  });

  it('should handle persist error', async () => {
    const store = useDossierStore();
    store.isRecording = true;
    store.addSection('t', {}, 't');
    vi.mocked(api.saveDossier).mockRejectedValue(new Error('DB Error'));

    await expect(store.persistToDb('Title')).rejects.toThrow('DB Error');
    expect(store.isSaving).toBe(false);
  });

  it('should notify saved', () => {
    const store = useDossierStore();
    const before = store.lastSavedAt;
    store.notifySaved();
    expect(store.lastSavedAt).not.toBe(before);
  });
});
