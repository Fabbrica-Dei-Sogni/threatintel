// useDossierDetail.ts
import { ref, watch } from 'vue';
import { fetchDossierById, updateDossier } from '../api';
import type { IDossier, IDossierSection } from '../models/DossierDTO';
import { useDossierStore } from '../stores/dossier';

export function useDossierDetail() {
    const dossier = ref<IDossier | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const isSaving = ref(false);
    
    const dossierStore = useDossierStore();

    /**
     * Helper per ordinare le sezioni: generic prima, poi il resto (per timestamp desc)
     */
    const sortSections = (sections: IDossierSection[]) => {
        return [...sections].sort((a, b) => {
            // Tipo generic ha sempre la precedenza (Note Investigative First)
            if (a.type === 'generic' && b.type !== 'generic') return -1;
            if (a.type !== 'generic' && b.type === 'generic') return 1;
            
            // All'interno dello stesso gruppo, ordiniamo per data (più recenti in alto)
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
        });
    };

    const loadDossier = async (id: string) => {
        if (!id) return;
        loading.value = true;
        error.value = null;
        try {
            const data = await fetchDossierById(id);
            dossier.value = data;
        } catch (err) {
            console.error('[useDossierDetail] Errore caricamento:', err);
            error.value = 'Errore nel caricamento del dossier';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const saveMetadata = async (id: string, metadata: { title: string; description: string }) => {
        if (!id) return;
        isSaving.value = true;
        try {
            const updated = await updateDossier(id, metadata);
            if (dossier.value) {
                dossier.value.title = updated.title || metadata.title;
                dossier.value.description = updated.description || metadata.description;
            }
            dossierStore.notifySaved();
            return updated;
        } catch (err) {
            console.error('[useDossierDetail] Errore salvataggio metadata:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    const addGenericSection = async (id: string) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const newSection: IDossierSection = {
                templateKey: 'clipboard.generic',
                type: 'generic',
                data: { text: '' },
                timestamp: new Date().toISOString(),
                order: 0
            };
            
            const updatedSections = sortSections([newSection, ...dossier.value.sections]);
            await updateDossier(id, { sections: updatedSections });
            dossier.value.sections = updatedSections;
            dossierStore.notifySaved();
            return updatedSections;
        } catch (err) {
            console.error('[useDossierDetail] Errore aggiunta sezione:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    const updateSection = async (id: string, index: number, sectionData: Partial<IDossierSection>) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const updatedSections = [...dossier.value.sections];
            updatedSections[index] = {
                ...updatedSections[index],
                ...sectionData
            };
            
            const finalizedSections = sortSections(updatedSections);
            await updateDossier(id, { sections: finalizedSections });
            dossier.value.sections = finalizedSections;
            dossierStore.notifySaved();
            return finalizedSections;
        } catch (err) {
            console.error('[useDossierDetail] Errore aggiornamento sezione:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    const deleteSection = async (id: string, index: number) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const updatedSections = dossier.value.sections.filter((_, i) => i !== index);
            await updateDossier(id, { sections: updatedSections });
            dossier.value.sections = updatedSections;
            dossierStore.notifySaved();
            return updatedSections;
        } catch (err) {
            console.error('[useDossierDetail] Errore eliminazione sezione:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    return {
        dossier,
        loading,
        error,
        isSaving,
        loadDossier,
        saveMetadata,
        addGenericSection,
        updateSection,
        deleteSection
    };
}
