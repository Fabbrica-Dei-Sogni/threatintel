import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

export function useClipboard() {
    const { t, tm } = useI18n();

    const copyToClipboard = async (text: string) => {
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
     * @param templateKey La chiave i18n
     * @param data Dati per i placeholder
     * @returns La stringa renderizzata
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
     */
    const copyFormatted = async (templateKey: string, data: Record<string, any>) => {
        const rendered = renderTemplate(templateKey, data);
        if (rendered) {
            await copyToClipboard(rendered);
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
