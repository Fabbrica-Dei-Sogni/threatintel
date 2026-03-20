<template>
    <div class="cowrie-sessions attacchi">
        <div class="header-top">
            <h1>{{ $t('cowrie.sessions.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <div class="actions">
            <button @click="$router.push('/')" class="btn-action">{{ $t('cowrie.sessions.backToDashboard') }}</button>
        </div>

        <div v-if="loading" class="loading">{{ $t('cowrie.sessions.loading') }}</div>
        <div v-if="error" class="error">{{ error }}</div>

        <!-- Pagination superiore -->
        <div class="pagination" v-if="totalPages > 1 && !loading && !error">
            <button :disabled="page === 1" @click="changePage(page - 1)">{{ $t('common.prev') }}</button>
            <span>{{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }}</button>
        </div>

        <section class="log-table" v-if="!loading && !error">
            <table>
                <thead>
                    <tr>
                        <th>{{ $t('cowrie.sessions.table.ip') }}</th>
                        <th>{{ $t('cowrie.sessions.table.country') }}</th>
                        <th>{{ $t('cowrie.sessions.table.startTime') }}</th>
                        <th>{{ $t('cowrie.sessions.table.duration') }}</th>
                        <th>{{ $t('cowrie.sessions.table.exploration') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="session in sessions" :key="session.session" class="cyber-row">
                        <td class="ip-cell">
                            <span class="ip-container">
                                <span class="ip-link" @click="goToIpDetails(session.src_ip)" title="Info IP">
                                    {{ session.src_ip }}
                                </span>
                                <button @click.stop="copyToClipboard(session.src_ip)" class="btn-copy-mini"
                                    title="Copia">📋</button>
                            </span>
                        </td>
                        <td>
                            <CountryFlag v-if="session.ipDetailsId?.ipinfo?.country"
                                :countryCode="session.ipDetailsId.ipinfo.country" />
                            <span v-else class="dimmed">-</span>
                        </td>
                        <td class="time-cell">{{ formatDate(session.starttime) }}</td>
                        <td class="duration-cell">{{ computeDuration(session.starttime, session.endtime) }}</td>
                        <td>
                            <router-link :to="{ name: 'CowrieAttackDetail', params: { id: session.session } }"
                                class="detail-btn">
                                {{ $t('cowrie.sessions.table.viewTimeline') }}
                            </router-link>
                        </td>
                    </tr>
                    <tr v-if="sessions.length === 0">
                        <td colspan="5" class="empty-state">{{ $t('cowrie.sessions.emptyState') }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <div class="pagination cyber-pagination" v-if="totalPages > 1">
            <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ $t('common.prev') }}</button>
            <span class="page-indicator">{{ $t('common.page') }} <span class="highlight">{{ page }}</span> {{
                $t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }} ►</button>
        </div>
    </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useClipboard } from '../../composable/useClipboard';
import CountryFlag from '../../components/CountryFlag.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const props = defineProps({
    initialPage: { type: Number, default: 1 },
    initialLimit: { type: Number, default: 20 }
});

const { t } = useI18n();
const { copyToClipboard } = useClipboard();
const router = useRouter();

const {
    sessions,
    page,
    limit,
    totalPages,
    loading,
    error,
    fetchData
} = useCowrieSessions(props.initialPage, props.initialLimit);

// Sincronizza l'URL quando cambia lo stato
watch([page, limit], ([newPage, newLimit]) => {
    router.replace({
        name: 'CowrieSessions',
        query: {
            page: newPage > 1 ? newPage : undefined,
            limit: newLimit !== 20 ? newLimit : undefined
        }
    });
});

const changePage = (p) => {
    if (p >= 1 && p <= totalPages.value) {
        page.value = p;
    }
};

const goToIpDetails = (ip) => {
    router.push({
        name: 'IpDetails',
        params: { ip },
        query: {
            // Passiamo lo stato per poter tornare indietro (anche se IpDetails usa router.back)
            returnPage: page.value,
            returnLimit: limit.value
        }
    });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss');
};

const computeDuration = (start, end) => {
    if (!start || !end) return '-';
    const s = dayjs(start);
    const e = dayjs(end);
    const diff = e.diff(s, 'second');
    return `${diff}s`;
};

onMounted(() => {
    fetchData();
});
</script>

<style scoped src="./CowrieSessions.css"></style>
