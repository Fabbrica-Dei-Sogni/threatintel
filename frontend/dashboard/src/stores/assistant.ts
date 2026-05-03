import { defineStore } from 'pinia';
import { ref } from 'vue';
import { askAgent, semanticSearch, resolveSource } from '../api';

export const useAssistantStore = defineStore('assistant', () => {
    const isSearchVisible = ref(false);
    const query = ref('');
    const results = ref([]);
    const aiResponse = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const thoughts = ref([]); // Per mostrare i "ragionamenti" dell'agente (chain of thought)

    const toggleSearch = () => {
        isSearchVisible.value = !isSearchVisible.value;
        if (isSearchVisible.value) {
            // Focus logic can be handled in the component
        }
    };

    const performSearch = async (userQuery: string) => {
        query.value = userQuery;
        loading.value = true;
        error.value = null;
        aiResponse.value = null;
        thoughts.value = [];

        try {
            // Chiamata all'agente orchestrato
            const response = await askAgent(userQuery);
            
            // ChainPrompt restituisce solitamente un oggetto con content e potenzialmente tool_calls
            aiResponse.value = response.content || response;
            
            // Se ci sono risultati di ricerca semantica diretti o tool results, li mettiamo in results
            if (response.tool_results) {
                results.value = response.tool_results;
            }
        } catch (err: any) {
            error.value = err.message || 'Errore durante la comunicazione con l\'Agente';
            console.error('[AssistantStore] Search error:', err);
        } finally {
            loading.value = false;
        }
    };

    const reset = () => {
        query.value = '';
        results.value = [];
        aiResponse.value = null;
        error.value = null;
        thoughts.value = [];
    };

    return {
        isSearchVisible,
        query,
        results,
        aiResponse,
        loading,
        error,
        thoughts,
        toggleSearch,
        performSearch,
        reset
    };
});
