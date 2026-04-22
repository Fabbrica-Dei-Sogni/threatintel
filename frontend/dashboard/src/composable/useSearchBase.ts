import { ref, watch, type Ref } from 'vue';
import type { SortFields } from '../models/CommonDTO';

interface UseSearchBaseOptions {
    fetchFn: () => Promise<void>;
    initialPage?: number;
    initialPageSize?: number;
    initialSortFields?: SortFields;
    filterRefs?: Ref<any>[]; // Riferimenti ai filtri da osservare
    debounceMs?: number;
}

export function useSearchBase(options: UseSearchBaseOptions) {
    const {
        fetchFn,
        initialPage = 1,
        initialPageSize = 20,
        initialSortFields = {},
        filterRefs = [],
        debounceMs = 300
    } = options;

    // Stato di base
    const page: Ref<number> = ref(initialPage);
    const pageSize: Ref<number> = ref(initialPageSize);
    const sortFields: Ref<SortFields> = ref(initialSortFields);
    const total: Ref<number> = ref(0);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<any> = ref(null);

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

            debouncedFetch();
        },
        { deep: true, immediate: true }
    );

    // Gestione Sorting
    function toggleSort(field: string): void {
        const newSort = { ...(sortFields.value || {}) };
        const currentDirection = newSort[field];

        if (currentDirection === undefined) {
            newSort[field] = 1;
        } else if (currentDirection === 1) {
            newSort[field] = -1;
        } else {
            delete newSort[field];
        }

        sortFields.value = Object.keys(newSort).length > 0 ? newSort : null;
    }

    function getSortDirection(field: string): number {
        return sortFields.value?.[field] || 0;
    }

    function getSortClass(field: string): string {
        const dir = getSortDirection(field);
        if (dir === 1) return 'sorted-asc';
        if (dir === -1) return 'sorted-desc';
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
