import { ElMessage } from 'element-plus';

export function useClipboard() {
    const copyToClipboard = async (text: string) => {
        if (!text) return;

        try {
            // Modern API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                ElMessage({
                    message: 'Copiato negli appunti: ' + text,
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
                    ElMessage({
                        message: 'Copiato negli appunti: ' + text,
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
                message: 'Errore durante la copia',
                type: 'error',
                duration: 2000
            });
        }
    };

    return {
        copyToClipboard
    };
}
