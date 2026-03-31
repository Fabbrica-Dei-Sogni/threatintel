import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useDossierStore } from '../stores/dossier';

export function useClipboard() {
    const { t, tm } = useI18n();
    const dossierStore = useDossierStore();

    const copyToClipboard = async (text: string, fromFormatted = false) => {
        if (!text) return;

        try {
            // Modern API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                const displayedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
                ElMessage({
                    message: t('common.copied') + ': ' + displayedText,
                    type: 'success',
                    duration: 2000
                });
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // Ensure it's not visible
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    const displayedText = text.length > 200 ? text.substring(0, 100) + '...' : text;
                    ElMessage({
                        message: t('common.copied') + ': ' + displayedText,
                        type: 'success',
                        duration: 2000
                    });
                } else {
                    throw new Error('Fallback copy failed');
                }
            }

            // [REC] Integrazione Automatica Dossier
            // Se siamo in modalità REC e NON proviene da copyFormatted, registriamo come generico
            if (dossierStore.isRecording && !fromFormatted) {
                dossierStore.addSection('clipboard.generic', { text }, text);
                ElMessage({
                    message: `🔴 [REC] ${t('common.addedToDossier')}`,
                    type: 'warning',
                    duration: 3000
                });
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
            ElMessage({
                message: t('common.error'),
                type: 'error',
                duration: 2000
            });
        }
    };

    /**
     * Rende un template i18n in una stringa piatta senza copiarla negli appunti
     */
    const renderTemplate = (templateKey: string, data: Record<string, any>): string => {
        try {
            const template = tm(templateKey) as any;
            
            if (Array.isArray(template)) {
                return template.map((line: string) => {
                    return line.replace(/{(\w+)}/g, (match, key) => {
                        const value = data[key];
                        return (value !== undefined && value !== null && value !== '') 
                            ? value 
                            : t('common.notAvailable');
                    });
                }).join('\n');
            } else if (typeof template === 'string') {
                return template.replace(/{(\w+)}/g, (match, key) => {
                    const value = data[key];
                    return (value !== undefined && value !== null && value !== '') 
                        ? value 
                        : t('common.notAvailable');
                });
            }
            return '';
        } catch (error) {
            console.error(`[useClipboard] Errore nel rendering del template ${templateKey}:`, error);
            return '';
        }
    };

    /**
     * Copia negli appunti un testo formattato basato su un template i18n
     * Se siamo in REC, aggiunge automaticamente la sezione atomica (chiave + dati)
     */
    const copyFormatted = async (templateKey: string, data: Record<string, any>) => {
        const rendered = renderTemplate(templateKey, data);
        if (rendered) {
            // Chiamiamo copyToClipboard passando true per indicare che è già processata
            await copyToClipboard(rendered, true);

            if (dossierStore.isRecording) {
                dossierStore.addSection(templateKey, data, rendered);
                ElMessage({
                    message: `🔴 [REC] ${t('common.addedToDossier')}`,
                    type: 'warning',
                    duration: 3000
                });
            }
        } else {
            console.warn(`[useClipboard] Template non trovato o vuoto per la chiave: ${templateKey}`);
        }
    };

    return {
        copyToClipboard,
        renderTemplate,
        copyFormatted
    };
}
