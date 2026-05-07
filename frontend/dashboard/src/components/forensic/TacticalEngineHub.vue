<template>
  <div class="tactical-engine-hub" :class="['skin-' + dashboardSkin, { 'is-loading': loading }]">
    <div class="hub-inner glass-morphism">
      <!-- Hub Header -->
      <div class="hub-header">
        <div class="header-main">
          <span class="hub-icon">📡</span>
          <div class="hub-title-stack">
            <h4 class="hub-label">TACTICAL ENGINE TUNING</h4>
            <p class="hub-subtitle">Calibrazione parametri euristici e pesi degli indicatori</p>
          </div>
        </div>
        
        <div class="hub-meta">
          <div class="meta-item">
            <span class="m-label">ACTIVE PARAMETERS:</span>
            <span class="m-value">{{ configs.length }}</span>
          </div>
          <div class="meta-item" :class="{ 'pulse': status !== 'OPTIMIZED' }">
            <span class="m-label">ENGINE STATUS:</span>
            <span class="m-value" :class="'status-' + status.toLowerCase()">{{ status }}</span>
          </div>
        </div>
      </div>

      <!-- Search / Filter (Tactical) -->
      <div class="hub-search-bar">
        <div class="search-wrap">
          <span class="s-icon">🔍</span>
          <input 
            type="text" 
            v-model="internalSearch" 
            placeholder="FILTER TTPs / PARAMETERS..."
            @input="$emit('update:searchQuery', internalSearch)"
          />
          <button v-if="internalSearch" class="btn-clear" @click="clearSearch">✕</button>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading" class="hub-loading-overlay">
        <div class="loading-scanner"></div>
        <span class="l-text">SCANNING CORE PARAMETERS...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="hub-error-state">
        <span class="e-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="btn btn-retry" @click="$emit('retry')">RE-INITIALIZE ENGINE</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="configs.length === 0" class="hub-empty-state">
        <span class="empty-icon">📭</span>
        <p>NO PARAMETERS MATCH THE CURRENT FILTER</p>
      </div>

      <!-- Parameters Grid -->
      <div v-else class="tactical-params-grid scrollable-body">
        <ConfigEditor 
          v-for="config in configs" 
          :key="config.key" 
          :config-key="config.key"
          :model-value="config.value" 
          :saving="saving" 
          @save="(key, val) => $emit('save', key, val)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
import ConfigEditor from '../ConfigEditor.vue';

const props = defineProps<{
  configs: Array<{ key: string; value: string }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchQuery: string;
  status: string;
}>();

const emit = defineEmits(['update:searchQuery', 'save', 'retry']);

const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const internalSearch = ref(props.searchQuery);

watch(() => props.searchQuery, (newVal) => {
  internalSearch.value = newVal;
});

function clearSearch() {
  internalSearch.value = '';
  emit('update:searchQuery', '');
}
</script>

<style scoped>
.tactical-engine-hub {
  margin-top: 25px;
  animation: hub-slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes hub-slide-in {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hub-inner {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(99, 102, 241, 0.05);
  position: relative;
  overflow: hidden;
}

.hub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 15px;
}

.hub-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
}

.hub-title-stack {
  display: flex;
  flex-direction: column;
}

.hub-label {
  margin: 0;
  font-size: 1rem;
  font-weight: 950;
  letter-spacing: 3px;
  color: #fff;
  text-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
}

.hub-subtitle {
  margin: 2px 0 0 0;
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hub-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.m-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: #6366f1;
  letter-spacing: 1px;
}

.m-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 900;
  font-size: 0.85rem;
  color: #fff;
}

.status-optimized {
  color: #10b981;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}

.status-tuning, .status-syncing {
  color: #f59e0b;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.status-initializing {
  color: #6366f1;
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
}

.pulse .m-value:not(.status-optimized) {
  animation: status-pulse 2s infinite;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.hub-search-bar {
  margin-bottom: 25px;
}

.search-wrap {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0 15px;
  transition: all 0.3s;
}

.search-wrap:focus-within {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
}

.s-icon { margin-right: 12px; opacity: 0.5; }

.search-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 12px 0;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.search-wrap input:focus { outline: none; }

.btn-clear {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 5px;
}

/* Params Grid */
.tactical-params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
  gap: 15px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 5px;
}

/* Custom Scrollbar for Hub */
.tactical-params-grid::-webkit-scrollbar { width: 4px; }
.tactical-params-grid::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
.tactical-params-grid::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }

/* Loading State */
.hub-loading-overlay {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-scanner {
  width: 100px;
  height: 2px;
  background: #6366f1;
  box-shadow: 0 0 15px #6366f1;
  animation: scanner-move 2s infinite ease-in-out;
}

@keyframes scanner-move {
  0%, 100% { transform: translateY(-10px); width: 0; opacity: 0; }
  50% { transform: translateY(0); width: 100px; opacity: 1; }
}

.l-text {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 3px;
  color: #6366f1;
}

.hub-error-state, .hub-empty-state {
  padding: 60px 0;
  text-align: center;
}

.e-icon, .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 15px; }

.btn-retry {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 25px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 15px;
}

/* Skin Overrides */
.skin-neon .hub-inner { border-color: #00f2ff; box-shadow: 0 0 30px rgba(0, 242, 255, 0.1); }
.skin-neon .hub-label { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; }
.skin-neon .m-label { color: #00f2ff; }

@media (max-width: 768px) {
  .hub-header { flex-direction: column; align-items: flex-start; gap: 15px; }
  .hub-meta { width: 100%; justify-content: space-between; }
  .hub-inner { padding: 20px; }
}
</style>
