/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { saveDossier } from '../api';


export interface DossierSection {
    id: string;
    templateKey: string;
    data: any;
    renderedText: string;
    type: 'ip' | 'attack' | 'telnet' | 'rate_breach' | 'scanner_analysis' | 'generic';
    timestamp: string;
}

export const useDossierStore = defineStore('dossier', () => {
    const isRecording = ref(false);
    const isEnabled = ref(true); // Global visibility toggle
    const sections = ref<DossierSection[]>([]);
    const clipboardBuffer = ref('');
    const isSaving = ref(false);
    const lastSavedAt = ref<number | null>(null);


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
        else if (templateKey.includes('attackDetail.rateLimitEvent')) type = 'rate_breach';
        else if (templateKey.includes('attackDetail')) type = 'attack';
        else if (templateKey.includes('telnetDetail.scannerAnalysis')) type = 'scanner_analysis';
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

    /**
     * Salva il dossier corrente nel database MongoDB tramite API.
     */
    const persistToDb = async (title: string, description: string = '', tags: string[] = []) => {
        if (sections.value.length === 0) return;
        
        isSaving.value = true;
        try {
            const payload = {
                title,
                description,
                status: 'finalized',
                tags,
                sections: sections.value.map(s => ({
                    templateKey: s.templateKey,
                    data: s.data,
                    type: s.type,
                    timestamp: s.timestamp,
                    renderedText: s.renderedText
                }))
            };

            const saved = await saveDossier(payload);
            
            // Trigger per il refresh delle viste interessate (es: Archivio)
            lastSavedAt.value = Date.now();
            
            return saved;
        } catch (error) {
            console.error('[DossierStore] Errore nel salvataggio su DB:', error);
            throw error;
        } finally {
            isSaving.value = false;
        }
    };

    const notifySaved = () => {
        lastSavedAt.value = Date.now();
    };

    return {
        isRecording,
        isEnabled,
        sections,
        clipboardBuffer,
        isSaving,
        lastSavedAt,
        startRecording,
        stopRecording,
        reset,
        addSection,
        removeSection,
        persistToDb,
        notifySaved
    };
});
