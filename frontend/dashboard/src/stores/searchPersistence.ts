import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSearchStore = defineStore('search-persistence', () => {
    // Mappa che associa il nome della rotta all'ultima query string utilizzata
    const lastQueries = ref<Record<string, any>>({});

    function saveQuery(routeName: string, query: any) {
        if (!routeName) return;
        
        // Puliamo la query da valori undefined o null per non sporcare l'URL
        const cleanQuery = Object.entries(query).reduce((acc, [key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                acc[key] = val;
            }
            return acc;
        }, {} as Record<string, any>);

        lastQueries.value[routeName] = { ...cleanQuery };
    }

    function getQuery(routeName: string) {
        return lastQueries.value[routeName] || null;
    }

    function clearQuery(routeName: string) {
        delete lastQueries.value[routeName];
    }

    return {
        lastQueries,
        saveQuery,
        getQuery,
        clearQuery
    };
});
