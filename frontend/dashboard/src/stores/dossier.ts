import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export interface DossierSection {
    id: string;
    templateKey: string;
    data: any;
    renderedText: string;
    type: 'ip' | 'attack' | 'telnet' | 'generic';
    timestamp: string;
}

export const useDossierStore = defineStore('dossier', () => {
    const isRecording = ref(false);
    const isEnabled = ref(true); // Global visibility toggle
    const sections = ref<DossierSection[]>([]);
    const clipboardBuffer = ref('');

    // Caricamento iniziale da localStorage
    const savedDossier = localStorage.getItem('custom_dossier_session');
    if (savedDossier) {
        try {
            const parsed = JSON.parse(savedDossier);
            isRecording.value = parsed.isRecording || false;
            isEnabled.value = parsed.isEnabled !== undefined ? parsed.isEnabled : true;
            sections.value = parsed.sections || [];
            clipboardBuffer.value = parsed.clipboardBuffer || '';
        } catch (e) {
            console.error('[DossierStore] Errore nel caricamento della sessione:', e);
        }
    }

    // Persistenza automatica ad ogni modifica
    watch([isRecording, isEnabled, sections, clipboardBuffer], () => {
        localStorage.setItem('custom_dossier_session', JSON.stringify({
            isRecording: isRecording.value,
            isEnabled: isEnabled.value,
            sections: sections.value,
            clipboardBuffer: clipboardBuffer.value
        }));
    }, { deep: true });

    const startRecording = () => {
        isRecording.value = true;
    };

    const stopRecording = () => {
        isRecording.value = false;
    };

    const reset = () => {
        sections.value = [];
        clipboardBuffer.value = '';
        isRecording.value = false;
        localStorage.removeItem('custom_dossier_session');
    };

    const addSection = (templateKey: string, data: any, renderedText: string) => {
        if (!isRecording.value) return;

        // Determiniamo il tipo in base alla chiave del template
        let type: DossierSection['type'] = 'generic';
        if (templateKey.includes('ipDetails')) type = 'ip';
        else if (templateKey.includes('attackDetail')) type = 'attack';
        else if (templateKey.includes('telnetDetail')) type = 'telnet';

        const newSection: DossierSection = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            templateKey,
            data,
            renderedText,
            type,
            timestamp: new Date().toISOString()
        };

        sections.value.push(newSection);

        // Aggiorniamo il buffer degli appunti (accodamento)
        const separator = clipboardBuffer.value ? '\n\n' : '';
        clipboardBuffer.value += separator + renderedText;
    };

    const removeSection = (id: string) => {
        sections.value = sections.value.filter(s => s.id !== id);
    };

    return {
        isRecording,
        isEnabled,
        sections,
        clipboardBuffer,
        startRecording,
        stopRecording,
        reset,
        addSection,
        removeSection
    };
});
