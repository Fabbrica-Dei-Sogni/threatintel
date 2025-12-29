import { ref, computed, watch } from 'vue';
import { fetchAllConfigs, saveConfig, deleteConfig, searchConfigs, type ConfigItem } from '../api/config';

/**
 * Composable per la gestione delle configurazioni honeypot
 * Fornisce stato reattivo e operazioni CRUD
 */
export function useConfig() {
    const configs = ref<ConfigItem[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref<string | null>(null);
    const searchQuery = ref('');

    /**
     * Configurazioni filtrate per ricerca locale
     */
    const filteredConfigs = computed(() => {
        if (!searchQuery.value.trim()) {
            return configs.value;
        }
        const query = searchQuery.value.toLowerCase();
        return configs.value.filter(config =>
            config.key.toLowerCase().includes(query) ||
            config.value.toLowerCase().includes(query)
        );
    });

    /**
     * Carica tutte le configurazioni dal backend
     */
    async function loadConfigs(): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            configs.value = await fetchAllConfigs();
        } catch (err: any) {
            error.value = err.message || 'Errore nel caricamento delle configurazioni';
            console.error('[useConfig] loadConfigs error:', err);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Salva o aggiorna una configurazione
     */
    async function upsertConfig(key: string, value: string): Promise<boolean> {
        saving.value = true;
        error.value = null;
        try {
            const result = await saveConfig(key, value);
            // Aggiorna la lista locale
            const index = configs.value.findIndex(c => c.key === key);
            if (index >= 0) {
                configs.value[index] = result;
            } else {
                configs.value.push(result);
            }
            return true;
        } catch (err: any) {
            error.value = err.message || 'Errore nel salvataggio della configurazione';
            console.error('[useConfig] upsertConfig error:', err);
            return false;
        } finally {
            saving.value = false;
        }
    }

    /**
     * Elimina una configurazione
     */
    async function removeConfig(key: string): Promise<boolean> {
        saving.value = true;
        error.value = null;
        try {
            await deleteConfig(key);
            // Rimuove dalla lista locale
            configs.value = configs.value.filter(c => c.key !== key);
            return true;
        } catch (err: any) {
            error.value = err.message || 'Errore nell\'eliminazione della configurazione';
            console.error('[useConfig] removeConfig error:', err);
            return false;
        } finally {
            saving.value = false;
        }
    }

    /**
     * Ricerca configurazioni sul backend
     */
    async function search(query: string): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            if (query.trim()) {
                configs.value = await searchConfigs(query);
            } else {
                await loadConfigs();
            }
        } catch (err: any) {
            error.value = err.message || 'Errore nella ricerca delle configurazioni';
            console.error('[useConfig] search error:', err);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Determina il tipo di valore (lista o testo semplice)
     */
    function getValueType(value: string): 'list' | 'keyvalue' | 'text' {
        // Se contiene chiave:valore separati da virgola (es. SUSPICIOUS_SCORES)
        if (value.includes(':') && value.includes(',')) {
            const parts = value.split(',');
            const hasKeyValue = parts.some(p => p.includes(':'));
            if (hasKeyValue) {
                return 'keyvalue';
            }
        }
        // Se contiene virgole, è una lista
        if (value.includes(',')) {
            return 'list';
        }
        // Altrimenti testo semplice
        return 'text';
    }

    /**
     * Converte un valore stringa in array di tag
     */
    function valueToTags(value: string): string[] {
        if (!value) return [];
        return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }

    /**
     * Converte un array di tag in stringa valore
     */
    function tagsToValue(tags: string[]): string {
        return tags.filter(t => t.trim().length > 0).join(',');
    }

    return {
        // State
        configs,
        filteredConfigs,
        loading,
        saving,
        error,
        searchQuery,
        // Actions
        loadConfigs,
        upsertConfig,
        removeConfig,
        search,
        // Helpers
        getValueType,
        valueToTags,
        tagsToValue
    };
}
