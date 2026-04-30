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

// src/composable/useDossiersFilter.ts
import { ref } from 'vue';
import { fetchDossiers } from '../api';
import type { SortFields } from '../models/CommonDTO';
import { useSearchBase } from './useSearchBase';

export function useDossiersFilter(
  initialSearch: string = '',
  initialStatus: string = '',
  initialPage: number = 1,
  initialPageSize: number = 12,
  initialSortFields: SortFields = null
) {
  // Filtri specifici
  const filterSearch = ref(initialSearch);
  const filterStatus = ref(initialStatus);
  const dossiers = ref<any[]>([]);

  // Definizione dei campi che costituiscono un filtro
  const filterRefs = [
    filterSearch,
    filterStatus
  ];

  // Integrazione useSearchBase
  const {
      page,
      pageSize,
      sortFields,
      total,
      loading,
      error,
      toggleSort,
      getSortDirection,
      getSortClass,
      debouncedFetch
  } = useSearchBase({
      fetchFn: fetchData,
      initialPage,
      initialPageSize,
      initialSortFields,
      filterRefs
  });

  // Funzione per recuperare dati
  async function fetchData(): Promise<void> {
      if (loading.value) return;

      loading.value = true;
      error.value = null;

      const params = {
          page: page.value,
          pageSize: pageSize.value,
          search: filterSearch.value,
          status: filterStatus.value,
          sortFields: sortFields.value ? JSON.stringify(sortFields.value) : undefined
      };

      try {
          const response = await fetchDossiers(params);
          dossiers.value = response.items;
          total.value = response.total;
      } catch (err) {
          error.value = err;
          dossiers.value = [];
          total.value = 0;
          console.error('Errore fetch dossiers:', err);
      } finally {
          loading.value = false;
      }
  }

  return {
      dossiers,
      filterSearch,
      filterStatus,
      page,
      pageSize,
      sortFields,
      total,
      loading,
      error,
      fetchData,
      debouncedFetch,
      toggleSort,
      getSortDirection,
      getSortClass
  };
}
