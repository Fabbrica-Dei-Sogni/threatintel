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

  it('should start and stop recording', () => {
    const store = useDossierStore();
    expect(store.isRecording).toBe(false);
    
    store.startRecording();
    expect(store.isRecording).toBe(true);
    
    store.stopRecording();
    expect(store.isRecording).toBe(false);
  });

  it('should add sections when recording', () => {
    const store = useDossierStore();
    store.startRecording();
    
    store.addSection('ipDetails.title', { ip: '1.2.3.4' }, 'IP: 1.2.3.4');
    
    expect(store.sections.length).toBe(1);
    expect(store.sections[0].type).toBe('ip');
    expect(store.clipboardBuffer).toBe('IP: 1.2.3.4');
  });

  it('should not add sections when not recording', () => {
    const store = useDossierStore();
    store.addSection('test', {}, 'text');
    expect(store.sections.length).toBe(0);
  });

  it('should reset correctly', () => {
    const store = useDossierStore();
    store.startRecording();
    store.addSection('test', {}, 'text');
    
    store.reset();
    expect(store.sections.length).toBe(0);
    expect(store.isRecording).toBe(false);
    expect(store.clipboardBuffer).toBe('');
  });

  it('should persist to DB', async () => {
    const store = useDossierStore();
    store.startRecording();
    store.addSection('test', {}, 'text');
    
    vi.mocked(api.saveDossier).mockResolvedValue({ id: 'dossier-id' });

    const result = await store.persistToDb('My Dossier');
    
    expect(api.saveDossier).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Dossier'
    }));
    expect(result.id).toBe('dossier-id');
  });
});
