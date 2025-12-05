<template>
  <div class="threatlogs">
    <h1>{{ t('threatLogs.title') }}</h1>
    <!-- Pulsante per navigare alla Home -->
    <div class="actions">
      <button @click="goToHome" class="btn-action">
        {{ t('threatLogs.dashboard') }}
      </button>
      <button @click="goToAttacks" class="btn-action">
        {{ t('threatLogs.attacks') }}
      </button>
    </div>

    <section class="filters">
      <div class="input-wrapper" style="position: relative; flex: 1; margin-right: 10px;">
        <input v-model="filterIp" :placeholder="t('threatLogs.filterByIp')" @input="onFilterChanged" class="input"
          type="text" />
        <button v-if="filterIp" @click="clearIpFilter" class="clear-button" :title="t('threatLogs.clearIpFilter')"
          type="button" aria-label="Clear IP filter">
          ✕
        </button>

      </div>
      <div class="input-wrapper" style="position: relative; flex: 1;">
        <input v-model="filterUrl" :placeholder="t('threatLogs.filterByUrl')" @input="onFilterChanged" class="input"
          type="text" />
        <button v-if="filterUrl" @click="clearUrlFilter" class="clear-button" :title="t('threatLogs.clearUrlFilter')"
          type="button" aria-label="Clear URL filter">
          ✕
        </button>
      </div>
    </section>

    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page === 1" @click="changePage(page - 1)">{{ t('common.prev') }}</button>
      <span>{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }}</button>

      <!-- Input per inserire pagina manualmente -->
      <label for="pageInput" style="margin-left: 10px;">{{ t('common.goToPage') }}:</label>
      <input class="pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1" :max="totalPages"
        style="width: 60px; padding: 2px 5px;" placeholder="1" />
    </div>

    <section class="log-table">
      <table>
        <thead>
          <tr>
            <th>
              <span class="label">{{ t('threatLogs.table.countryOrg') }}</span>
            </th>
            <th>{{ t('threatLogs.table.details') }}</th>
            <th>
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.ip') }}</span>
                <button @click="toggleSort('request.ip')" aria-label="Ordina IP" class="sort-button">
                  <span v-if="getSortDirection('request.ip') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.ip') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th>
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.dangerScore') }}</span>
                <button @click="toggleSort('fingerprint.score')" aria-label="Ordina Score" class="sort-button">
                  <span v-if="getSortDirection('fingerprint.score') === 1">▲</span>
                  <span v-else-if="getSortDirection('fingerprint.score') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th>
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.url') }}</span>
                <button @click="toggleSort('request.url')" aria-label="Ordina URL" class="sort-button">
                  <span v-if="getSortDirection('request.url') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.url') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th>
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.method') }}</span>
                <button @click="toggleSort('request.method')" aria-label="Ordina Metodo" class="sort-button">
                  <span v-if="getSortDirection('request.method') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.method') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th>
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.timestamp') }}</span>
                <button @click="toggleSort('timestamp')" aria-label="Ordina Timestamp" class="sort-button">
                  <span v-if="getSortDirection('timestamp') === 1">▲</span>
                  <span v-else-if="getSortDirection('timestamp') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log._id">
            <td>
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <CountryFlag v-if="log.ipDetailsId?.ipinfo?.country" :countryCode="log.ipDetailsId.ipinfo.country" />
                <!--
                <span>{{ log.ipDetailsId?.ipinfo?.country || '-' }}</span>
              -->
              </div>
            </td>
            <td><button @click="goToThreatLogDetails(log.id)" style="cursor: pointer;" class="info-btn">{{
              t('common.detail') }}</button></td>
            <td>
              <span style="display:inline-flex;align-items:center;">
                <span class="info-btn" @click="goToIpDetails(log.request.ip)" style="cursor: pointer;"
                  title="Info IP">{{
                    log.request.ip }}</span>
                <button @click.stop="setIpFilter(log.request.ip)" class="btn-copy-ip"
                  :title="t('attacks.copyToFilter')">⬇️</button>
              </span>
            </td>
            <td>{{ log.fingerprint.score }}</td>

            <td class="url-cell">
              <span style="display:inline-flex;align-items:center;">
                {{ log.request.url }}
                <button @click.stop="setUrlFilter(log.request.url)" class="btn-copy-url"
                  :title="t('attacks.copyToFilter')">⬇️</button>
              </span>

            </td>

            <td>{{ log.request.method }}</td>
            <td>{{ formatDate(log.timestamp) }}</td>
          </tr>
          <tr v-if="logs.length === 0 && !loading">
            <td colspan="5" style="text-align:center;">{{ t('threatLogs.noLogsFound') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="total > pageSize">
        <button :disabled="page === 1" @click="changePage(page - 1)">{{ t('common.prev') }}</button>
        <span>{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }}</button>
      </div>

      <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
      <div v-if="error" class="error">{{ t('threatLogs.errorLoadingData') }}</div>
    </section>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import CountryFlag from '../../components/CountryFlag.vue'; // Import component

const { t } = useI18n();

//Best practise per definire una pagina vue con un composable
//step 0. creare il composable useLogsFilter con il necessario per la ricerca filtrata e paginata dei log

//step 1. definire le proprieta iniziali che al cambio di stato devono essere notificate durante la navigazione
// Props iniziali
const props = defineProps({
  initialIp: String,
  initialUrl: String,
  initialPage: {
    type: Number,
    default: 1,
  },
  initialSortFields: {
    type: Object,
    default: () => ({}),  // default ordinamento
  }
});

//step 2. istanziare il router 
// Router
const router = useRouter();

//step 3. esporre i dati gestiti dal composable fornendo i valori props di init
const {
  filterIp,
  filterUrl,
  sortFields,
  page,
  logs,
  total,
  loading,
  error,
  pageSize,
  fetchData,
  onFilterChanged,
  toggleSort,
  getSortDirection
} = useLogsFilter(props.initialIp, props.initialUrl, props.initialPage, props.initialSortFields);

//step 4. definire eventuali valori di tipo computer che cambiano a seconda il cambio dei valori
// Computed
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const previousPageBeforeIpFilter = ref(null);
const previousPageBeforeUrlFilter = ref(null);

//step 5. definire il watch sui valori che cambiano per aggiornare il router
watch([filterIp, filterUrl, page, sortFields], ([newIp, newUrl, newPage, newSortFields]) => {
  router.replace({
    name: 'ThreatLogs',
    query: {
      ip: newIp || undefined,
      url: newUrl || undefined,
      page: newPage > 1 ? newPage : undefined,
      sortFields: newSortFields ? JSON.stringify(newSortFields) : undefined
    },
  });
});

//step 6. definire tutti quei metodi necessari alla pagina di solito che usano il router o dati computed come totalPage
// Funzioni di navigazione

const inputPage = ref(page.value);

// Sincronizza inputPage con page esternamente modificato
watch(page, (newPage) => {
  inputPage.value = newPage;
});

// Debounce semplice per evitare troppe chiamate immediate
let debounceTimer = null;
watch(inputPage, (newPage) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    goToInputPage();
  }, 300);
});


function goToAttacks() {
  router.push('/attacks');
}

function goToHome() {
  router.push('/');
}

function goToIpDetails(ip) {
  router.push({
    name: 'IpDetails',
    params: { ip },
    query: {
      ip: filterIp.value,
      url: filterUrl.value,
      page: page.value,
      sortFields: sortFields.value
    },
  });
}

function goToThreatLogDetails(id) {
  router.push({
    name: 'ThreatLog',
    params: { id },
    query: {
      ip: filterIp.value,
      url: filterUrl.value,
      page: page.value,
      sortFields: sortFields.value
    },
  });
}

function setIpFilter(ip) {

  if (!filterIp.value) {
    previousPageBeforeIpFilter.value = page.value;
  }

  filterIp.value = ip;        // Imposta il filtro
  page.value = 1;             // Torna alla pagina 1 se serve
  onFilterChanged();          // Applica il filtro
}

function clearIpFilter() {
  filterIp.value = '';

  if (previousPageBeforeIpFilter.value !== null) {
    page.value = previousPageBeforeIpFilter.value;
    previousPageBeforeIpFilter.value = null;
  }

  onFilterChanged(false);
}

function setUrlFilter(ip) {

  if (!filterUrl.value) {
    previousPageBeforeUrlFilter.value = page.value;
  }

  filterUrl.value = ip;        // Imposta il filtro
  page.value = 1;             // Torna alla pagina 1 se serve
  onFilterChanged();          // Applica il filtro
}

function clearUrlFilter() {
  filterUrl.value = '';

  if (previousPageBeforeUrlFilter.value !== null) {
    page.value = previousPageBeforeUrlFilter.value;
    previousPageBeforeUrlFilter.value = null;
  }

  onFilterChanged(false);
}


function changePage(newPage) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
  }
}

function goToInputPage() {
  let targetPage = inputPage.value;

  // Validazione: assicurati che sia tra 1 e totalPages
  if (targetPage < 1) targetPage = 1;
  if (targetPage > totalPages.value) targetPage = totalPages.value;

  changePage(targetPage);
}

function formatDate(timestamp) {
  return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss');
}


//step 7. eseguire la chiamata iniziale per il primo rendering dei dati
fetchData();
</script>

<style scoped src="./ThreatLogs.css"></style>
