import { ref, watch, unref, type Ref } from 'vue';
import type { SortFields } from '../models/CommonDTO';
import { useSearchStore } from '../stores/searchPersistence';
import { useRoute } from 'vue-router';

interface UseSearchBaseOptions {
    fetchFn: () => Promise<void>;
    initialPage?: number | Ref<number>;
    initialPageSize?: number | Ref<number>;
    initialSortFields?: SortFields;
    filterRefs?: Ref<any>[]; // Riferimenti ai filtri da osservare
    debounceMs?: number;
    routeName?: string; // Nome della rotta per la persistenza
}

export function useSearchBase(options: UseSearchBaseOptions) {
    const {
        fetchFn,
        initialPage = 1,
        initialPageSize = 20,
        initialSortFields = {},
        filterRefs = [],
        debounceMs = 300,
        routeName
    } = options;

    const searchStore = useSearchStore();
    const route = useRoute();

    // Stato di base - usiamo unref per gestire sia valori che Ref passati
    const page: Ref<number> = ref(unref(initialPage));
    const pageSize: Ref<number> = ref(unref(initialPageSize));
    const sortFields: Ref<SortFields> = ref(initialSortFields);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<any> = ref(null);

    // Funzione helper per salvare lo stato corrente nello store globale
    const persistState = (filtersValues: any[]) => {
        const name = routeName || (route?.name as string);
        if (!name) return;

        // Costruiamo un oggetto query che riflette lo stato attuale dei filtri e della paginazione
        const query: Record<string, any> = {
            page: page.value > 1 ? page.value : undefined,
            sortFields: sortFields.value && Object.keys(sortFields.value).length > 0 ? JSON.stringify(sortFields.value) : undefined,
        };

        // Mappatura dinamica dei filtri basata sulla posizione nell'array filterRefs
        if (name === 'ThreatLogs') {
            query.ip = filtersValues[0] || undefined;
            query.url = filtersValues[1] || undefined;
            query.protocol = filtersValues[2] !== 'http' ? filtersValues[2] : undefined;
        } else if (name === 'Attacks') {
            query.ip = filtersValues[0] || undefined;
            query.protocol = filtersValues[1] !== 'http' ? filtersValues[1] : undefined;
        } else if (name === 'CowrieSessions') {
            query.ip = filtersValues[0] || undefined;
            query.category = filtersValues[1] !== 'interaction' ? filtersValues[1] : undefined;
        } else if (name === 'Home') {
            query.attackProtocol = filtersValues[0] || undefined;
            query.logProtocol = filtersValues[1] || undefined;
            query.sessionCategory = filtersValues[2] || undefined;
        }

        searchStore.saveQuery(name, query);
    };

    // Debouncing fetchData
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    function debouncedFetch() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchFn();
        }, debounceMs);
    }

    // Watcher unico per tutti i cambiamenti di stato (filtri, pagina, ordinamento)
    watch(
        [...filterRefs, page, pageSize, sortFields],
        (newVal, oldVal) => {
            // Se oldVal è undefined (primo run di immediate: true), eseguiamo solo il fetch.
            if (!oldVal) {
                debouncedFetch();
                return;
            }

            // Verifichiamo se è cambiato uno dei filtri (primi N elementi)
            const filtersChanged = filterRefs.some((_, i) => {
                const nv = newVal[i];
                const ov = oldVal[i];
                
                // Se oldVal è undefined o null, consideriamo che non sia cambiato rispetto all'inizializzazione
                if (ov === undefined || ov === null) return false;

                // Gestione specifica per Array/Oggetti (es. dateRange o dangerLevels)
                if (typeof nv === 'object' && nv !== null) {
                    return JSON.stringify(nv) !== JSON.stringify(ov);
                }

                return nv !== ov;
            });

            if (filtersChanged && page.value !== 1) {
                // Se cambiano i filtri, resettiamo sempre alla pagina 1
                page.value = 1;
                // fetchData verrà chiamato dal prossimo ciclo generato dal cambio di page
                return;
            }

            // Ogni volta che lo stato cambia (filtri o pagina), aggiorniamo lo store globale
            persistState(newVal.slice(0, filterRefs.length));

            debouncedFetch();
        },
        { deep: true, immediate: true }
    );

    // Helpers per l'ordinamento
    function toggleSort(field: string) {
        const current = { ...(sortFields.value || {}) };
        if (current[field] === -1) {
            current[field] = 1;
        } else if (current[field] === 1) {
            delete current[field];
        } else {
            current[field] = -1;
        }
        sortFields.value = Object.keys(current).length > 0 ? current : null;
    }

    function getSortDirection(field: string): number | null {
        return sortFields.value ? (sortFields.value[field] || null) : null;
    }

    function getSortClass(field: string): string {
        const dir = getSortDirection(field);
        if (dir === -1) return 'sorted-desc';
        if (dir === 1) return 'sorted-asc';
        return '';
    }

    return {
        page,
        pageSize,
        sortFields,
        total,
        loading,
        error,
        debouncedFetch,
        toggleSort,
        getSortDirection,
        getSortClass
    };
}
