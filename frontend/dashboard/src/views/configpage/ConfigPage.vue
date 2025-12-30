<template>
    <div class="config-page">
        <!-- Header -->
        <header class="page-header">
            <div class="header-left">
                <button class="back-btn" @click="goBack" :title="$t('common.back')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 class="page-title">{{ $t('config.title') }}</h1>
            </div>
            <LanguageSwitcher />
        </header>

        <!-- Toolbar -->
        <div class="toolbar">
            <div class="search-wrapper">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" v-model="searchQuery" :placeholder="$t('config.searchPlaceholder')"
                    class="search-input" />
                <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">×</button>
            </div>
            <div class="actions-group">
                <button class="btn btn-warning btn-reanalyze" @click="handleReanalyze" :disabled="saving">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path
                            d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 5M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-5">
                        </path>
                    </svg>
                    {{ $t('config.reanalyzeAll') }}
                </button>
                <button class="btn btn-primary btn-new" @click="openNewConfigModal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    {{ $t('config.newConfig') }}
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>{{ $t('common.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
            <p class="error-message">{{ error }}</p>
            <button class="btn btn-secondary" @click="loadConfigs">{{ $t('config.retry') }}</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredConfigs.length === 0" class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <p>{{ searchQuery ? $t('config.noSearchResults') : $t('config.noConfigs') }}</p>
            <button v-if="!searchQuery" class="btn btn-primary" @click="openNewConfigModal">
                {{ $t('config.createFirst') }}
            </button>
        </div>

        <!-- Config List -->
        <div v-else class="config-list">
            <ConfigEditor v-for="config in filteredConfigs" :key="config.key" :config-key="config.key"
                :model-value="config.value" :saving="saving" @save="handleSave" @delete="handleDelete" />
        </div>

        <!-- New Config Modal -->
        <div v-if="showNewModal" class="modal-overlay" @click.self="closeNewModal">
            <div class="modal-content">
                <h3 class="modal-title">{{ $t('config.newConfigTitle') }}</h3>

                <div class="form-group">
                    <label for="newKey">{{ $t('config.keyLabel') }}</label>
                    <input type="text" id="newKey" v-model="newConfigKey" :placeholder="$t('config.keyPlaceholder')"
                        class="form-input"
                        @input="newConfigKey = newConfigKey.toUpperCase().replace(/[^A-Z0-9_]/g, '')" />
                    <p class="help-text">{{ $t('config.keyHelp') }}</p>
                </div>

                <div class="form-group">
                    <label for="newValue">{{ $t('config.valueLabel') }}</label>
                    <textarea id="newValue" v-model="newConfigValue" :placeholder="$t('config.valuePlaceholderNew')"
                        class="form-textarea" rows="3"></textarea>
                    <p class="help-text">{{ $t('config.valueHelp') }}</p>
                </div>

                <div class="modal-actions">
                    <button class="btn btn-secondary" @click="closeNewModal">{{ $t('common.cancel') }}</button>
                    <button class="btn btn-primary" @click="createNewConfig" :disabled="!newConfigKey || saving">
                        {{ saving ? $t('common.loading') : $t('common.save') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Success Toast -->
        <Transition name="toast">
            <div v-if="successMessage" class="toast toast-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ successMessage }}
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfig } from '../../composable/useConfig';
import { useProfileStore } from '../../stores/profiles';
import ConfigEditor from '../../components/ConfigEditor.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const profileStore = useProfileStore();

// Composable per la gestione delle configurazioni
const {
    configs,
    filteredConfigs,
    loading,
    saving,
    error,
    searchQuery,
    loadConfigs,
    upsertConfig,
    removeConfig,
    reanalyzeAll
} = useConfig();

// State per nuovo config
const showNewModal = ref(false);
const newConfigKey = ref('');
const newConfigValue = ref('');

// Toast message
const successMessage = ref('');

// Navigation
function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
}

// Modal handlers
function openNewConfigModal() {
    newConfigKey.value = '';
    newConfigValue.value = '';
    showNewModal.value = true;
}

function closeNewModal() {
    showNewModal.value = false;
}

// CRUD handlers
async function createNewConfig() {
    if (!newConfigKey.value) return;

    const success = await upsertConfig(newConfigKey.value, newConfigValue.value);
    if (success) {
        showNewModal.value = false;
        showSuccess(t('config.configCreated'));
    }
}

async function handleSave(key: string, value: string) {
    const success = await upsertConfig(key, value);
    if (success) {
        showSuccess(t('config.configSaved'));
    }
}

async function handleDelete(key: string) {
    const success = await removeConfig(key);
    if (success) {
        showSuccess(t('config.configDeleted'));
    }
}

async function handleReanalyze() {
    if (!confirm(t('config.confirmReanalyze'))) return;

    const result = await reanalyzeAll();
    if (result) {
        showSuccess(t('config.reanalyzeSuccess', { analyzed: result.analyzed, updated: result.updated }));
    }
}

function showSuccess(message: string) {
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = '';
    }, 3000);
}

// Carica al mount e quando cambia profilo
onMounted(loadConfigs);
watch(() => profileStore.activeProfileId, loadConfigs);
</script>

<style scoped src="./ConfigPage.css"></style>
