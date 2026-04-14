// useDossierDetail.ts
import { ref, computed } from 'vue';
import { DossierSectionType, type IDossier, type IDossierSection } from '../models/DossierDTO';
import { useDossierStore } from '../stores/dossier';
import { useAuthStore } from '../stores/auth';
import { fetchDossierById, updateDossier } from '../api';

export function useDossierDetail() {
    const dossier = ref<IDossier | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const isSaving = ref(false);
    
    const dossierStore = useDossierStore();
    const authStore = useAuthStore();

    /**
     * Verifica se l'utente corrente può modificare il dossier
     */
    const canModify = computed(() => {
        if (!dossier.value || !authStore.user) return false;
        return authStore.isAdmin || dossier.value.owner === authStore.user.username;
    });

    /**
     * Helper per ordinare le sezioni: human prima, poi il resto (per timestamp desc)
     */
    const sortSections = (sections: IDossierSection[]) => {
        return [...sections].sort((a, b) => {
            // Human First (Note Investigative)
            if (a.type === DossierSectionType.HUMAN && b.type !== DossierSectionType.HUMAN) return -1;
            if (a.type !== DossierSectionType.HUMAN && b.type === DossierSectionType.HUMAN) return 1;
            
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

    const addHumanSection = async (id: string) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const newSection: IDossierSection = {
                type: DossierSectionType.HUMAN,
                templateKey: 'sectionHuman',
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

    const addObservation = async (id: string, sectionIndex: number, text: string) => {
        if (!id || !dossier.value || !text.trim()) return;
        isSaving.value = true;
        try {
            const updatedSections = [...dossier.value.sections];
            const section = updatedSections[sectionIndex];
            if (!section.observations) section.observations = [];
            section.observations.push(text);
            
            await updateDossier(id, { sections: updatedSections });
            dossier.value.sections = updatedSections;
            dossierStore.notifySaved();
        } catch (err) {
            console.error('[useDossierDetail] Errore aggiunta osservazione:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    const updateObservation = async (id: string, sectionIndex: number, obsIndex: number, text: string) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const updatedSections = [...dossier.value.sections];
            const section = updatedSections[sectionIndex];
            if (section.observations) {
                section.observations[obsIndex] = text;
            }
            
            await updateDossier(id, { sections: updatedSections });
            dossier.value.sections = updatedSections;
            dossierStore.notifySaved();
        } catch (err) {
            console.error('[useDossierDetail] Errore aggiornamento osservazione:', err);
            throw err;
        } finally {
            isSaving.value = false;
        }
    };

    const deleteObservation = async (id: string, sectionIndex: number, obsIndex: number) => {
        if (!id || !dossier.value) return;
        isSaving.value = true;
        try {
            const updatedSections = [...dossier.value.sections];
            const section = updatedSections[sectionIndex];
            if (section.observations) {
                section.observations.splice(obsIndex, 1);
            }
            
            await updateDossier(id, { sections: updatedSections });
            dossier.value.sections = updatedSections;
            dossierStore.notifySaved();
        } catch (err) {
            console.error('[useDossierDetail] Errore eliminazione osservazione:', err);
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
        addHumanSection,
        updateSection,
        deleteSection,
        addObservation,
        updateObservation,
        deleteObservation,
        canModify
    };
}
