<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <div class="algorithm-module glass-morphism" :class="{ 'is-expanded': isExpanded }">
    <!-- Module Header -->
    <div class="module-header" @click="toggleExpanded">
      <div class="module-identity">
        <div class="status-dot"></div>
        <span class="module-key">{{ configKey }}</span>
        <span class="type-pill" :class="valueType">{{ $t(`config.types.${valueType}`).toUpperCase() }}</span>
      </div>
      <div class="module-actions" @click.stop>
        <button class="action-icon-btn edit-btn" @click="startEdit" :title="$t('common.edit')">
          <span>📝</span>
        </button>
        <button class="action-icon-btn delete-btn" @click="confirmDelete" :title="$t('common.delete')">
          <span>🗑️</span>
        </button>
        <div class="expansion-indicator">
          <span class="chevron">{{ isExpanded ? '▲' : '▼' }}</span>
        </div>
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="!isExpanded && !isEditing" class="module-preview">
      <span class="preview-text-hud">{{ previewText }}</span>
    </div>

    <!-- Details & Editor Section -->
    <div v-if="isExpanded" class="module-content">
      <!-- READ-ONLY VIEW -->
      <template v-if="!isEditing">
        <div v-if="valueType === 'list'" class="tactical-tags">
          <span v-for="(tag, index) in tags" :key="index" class="tactical-tag">{{ tag }}</span>
        </div>

        <div v-else-if="valueType === 'keyvalue'" class="tactical-kv-grid">
          <div v-for="(item, index) in keyValuePairs" :key="index" class="kv-card-mini">
            <span class="kv-label">{{ item.key }}</span>
            <span class="kv-val">{{ item.value }}</span>
          </div>
        </div>

        <div v-else class="tactical-text-box">
          <p class="raw-data">{{ modelValue }}</p>
        </div>
      </template>

      <!-- EDIT MODE (INLINE) -->
      <template v-else>
        <div class="inline-editor-hud">
          <div class="editor-header-mini">
            <span class="editor-label">{{ $t('config.editConfig').toUpperCase() }}</span>
          </div>

          <!-- List Editor -->
          <div v-if="valueType === 'list'" class="editor-hub-list">
            <div class="tags-cluster">
              <div v-for="(tag, index) in editTags" :key="index" class="cluster-pill">
                <span>{{ tag }}</span>
                <button class="pill-remove" @click="removeTag(index)">✕</button>
              </div>
            </div>
            <div class="tactical-add-row">
              <input type="text" v-model="newTag" :placeholder="$t('config.addTagPlaceholder')"
                @keyup.enter="addTag" />
              <button class="btn btn-add-pulse" @click="addTag">+</button>
            </div>
          </div>

          <!-- Key-Value Editor -->
          <div v-else-if="valueType === 'keyvalue'" class="editor-hub-kv">
            <div class="kv-scroll-list">
              <div v-for="(item, index) in editKeyValuePairs" :key="index" class="kv-edit-row">
                <input type="text" v-model="item.key" placeholder="KEY" />
                <span class="kv-sep">:</span>
                <input type="text" v-model="item.value" placeholder="VALUE" />
                <button class="btn-remove-tactical" @click="removeKeyValue(index)">✕</button>
              </div>
            </div>
            <div class="kv-add-tactical">
              <input type="text" v-model="newKvKey" placeholder="NEW KEY" />
              <input type="text" v-model="newKvValue" placeholder="NEW VALUE" @keyup.enter="addKeyValue" />
              <button class="btn btn-add-pulse" @click="addKeyValue">+</button>
            </div>
          </div>

          <!-- Text Editor -->
          <div v-else class="editor-hub-text">
            <textarea v-model="editText" :placeholder="$t('config.textPlaceholder')" rows="4"
              class="cyber-textarea"></textarea>
          </div>

          <!-- Inline Actions -->
          <div class="inline-actions">
            <button class="btn btn-ghost-hud mini" @click="cancelEdit">{{ $t('common.cancel').toUpperCase() }}</button>
            <button class="btn btn-primary-hud mini shadow-glow" @click="saveEdit" :disabled="saving">
              {{ (saving ? $t('common.loading') : $t('common.save')).toUpperCase() }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Confirmation Dialog (Still Modal as it is a Critical Action) -->
    <div v-if="showDeleteConfirm" class="tactical-modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-dialog card-glass">
        <h3 class="error-accent">{{ $t('config.confirmDeleteTitle').toUpperCase() }}</h3>
        <p class="dialog-msg">{{ $t('config.confirmDeleteMessage', { key: configKey }) }}</p>
        <div class="dialog-actions-tactical">
          <button class="btn btn-ghost-hud" @click="showDeleteConfirm = false">{{ $t('common.cancel').toUpperCase() }}</button>
          <button class="btn btn-danger-hud" @click="executeDelete" :disabled="saving">
            {{ (saving ? $t('common.loading') : $t('common.delete')).toUpperCase() }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  configKey: string;
  modelValue: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save', key: string, value: string): void;
  (e: 'delete', key: string): void;
}>();

// State
const isExpanded = ref(false);
const isEditing = ref(false);
const showDeleteConfirm = ref(false);

// Edit state per lista
const editTags = ref<string[]>([]);
const newTag = ref('');

// Edit state per chiave:valore
const editKeyValuePairs = ref<Array<{ key: string; value: string }>>([]);
const newKvKey = ref('');
const newKvValue = ref('');

// Edit state per testo
const editText = ref('');

// Computed
const valueType = computed(() => {
  const value = props.modelValue;
  // Se contiene chiave:valore separati da virgola
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
  return 'text';
});

const tags = computed(() => {
  if (!props.modelValue) return [];
  return props.modelValue.split(',').map(v => v.trim()).filter(v => v.length > 0);
});

const keyValuePairs = computed(() => {
  if (!props.modelValue) return [];
  return props.modelValue.split(',').map(item => {
    const [key, value] = item.split(':').map(s => s.trim());
    return { key: key || '', value: value || '' };
  }).filter(item => item.key.length > 0);
});

const previewText = computed(() => {
  if (valueType.value === 'list') {
    const t = tags.value;
    if (t.length <= 3) return t.join(', ');
    return `${t.slice(0, 3).join(', ')} (+${t.length - 3})`;
  }
  if (valueType.value === 'keyvalue') {
    const kv = keyValuePairs.value;
    if (kv.length <= 2) return kv.map(i => `${i.key}:${i.value}`).join(', ');
    return `${kv.slice(0, 2).map(i => `${i.key}:${i.value}`).join(', ')} (+${kv.length - 2})`;
  }
  return props.modelValue.length > 50 ? props.modelValue.slice(0, 50) + '...' : props.modelValue;
});

// Methods
function toggleExpanded() {
  if (!isEditing.value) {
    isExpanded.value = !isExpanded.value;
  }
}

function startEdit() {
  isEditing.value = true;
  isExpanded.value = true;
  
  // Inizializza lo stato di editing in base al tipo
  if (valueType.value === 'list') {
    editTags.value = [...tags.value];
    newTag.value = '';
  } else if (valueType.value === 'keyvalue') {
    editKeyValuePairs.value = keyValuePairs.value.map(kv => ({ ...kv }));
    newKvKey.value = '';
    newKvValue.value = '';
  } else {
    editText.value = props.modelValue;
  }
}

function cancelEdit() {
  isEditing.value = false;
  newTag.value = '';
  newKvKey.value = '';
  newKvValue.value = '';
}

function addTag() {
  const tag = newTag.value.trim();
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
    newTag.value = '';
  }
}

function removeTag(index: number) {
  editTags.value.splice(index, 1);
}

function addKeyValue() {
  const key = newKvKey.value.trim();
  const value = newKvValue.value.trim();
  if (key) {
    editKeyValuePairs.value.push({ key, value });
    newKvKey.value = '';
    newKvValue.value = '';
  }
}

function removeKeyValue(index: number) {
  editKeyValuePairs.value.splice(index, 1);
}

function saveEdit() {
  let newValue = '';
  
  if (valueType.value === 'list') {
    newValue = editTags.value.filter(t => t.trim()).join(',');
  } else if (valueType.value === 'keyvalue') {
    newValue = editKeyValuePairs.value
      .filter(kv => kv.key.trim())
      .map(kv => `${kv.key.trim()}:${kv.value.trim()}`)
      .join(',');
  } else {
    newValue = editText.value;
  }
  
  emit('save', props.configKey, newValue);
  isEditing.value = false;
}

function confirmDelete() {
  showDeleteConfirm.value = true;
}

function executeDelete() {
  emit('delete', props.configKey);
  showDeleteConfirm.value = false;
}
</script>

<style scoped>
.algorithm-module {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin-bottom: 15px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.algorithm-module:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(15, 23, 42, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.algorithm-module.is-expanded {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

.module-header {
  padding: 18px 25px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.module-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #6366f1;
  border-radius: 50%;
  box-shadow: 0 0 10px #6366f1;
}

.module-key {
  font-family: 'Source Code Pro', monospace;
  font-weight: 700;
  font-size: 0.95rem;
  color: #e2e8f0;
  letter-spacing: 0.5px;
}

.type-pill {
  font-size: 0.6rem;
  font-weight: 950;
  letter-spacing: 1.5px;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.type-pill.list { color: #60a5fa; border-color: rgba(96, 165, 250, 0.3); }
.type-pill.keyvalue { color: #c084fc; border-color: rgba(192, 132, 252, 0.3); }
.type-pill.text { color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }

.module-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-icon-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.edit-btn:hover { border-color: #60a5fa; }
.delete-btn:hover { border-color: #f87171; }

.expansion-indicator {
  margin-left: 5px;
  color: #64748b;
  font-size: 0.7rem;
}

/* Inline Editor Hud */
.module-content {
  padding: 0 25px 25px 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(0, 0, 0, 0.15);
}

.inline-editor-hud {
  padding-top: 20px;
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.editor-header-mini {
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.editor-label {
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6366f1;
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn.mini {
  padding: 8px 18px;
  font-size: 0.7rem;
  letter-spacing: 1.5px;
}

/* Cluster Pills */
.tags-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 15px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.cluster-pill {
  background: rgba(30, 41, 59, 0.8);
  padding: 6px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  font-family: 'Source Code Pro', monospace;
  border: 1px solid rgba(99, 102, 241, 0.1);
  transition: all 0.2s;
}

.cluster-pill:hover {
  background: rgba(30, 41, 59, 1);
  border-color: rgba(99, 102, 241, 0.4);
}

.pill-remove {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  color: #f87171;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.6rem;
  transition: all 0.2s;
}

.pill-remove:hover {
  background: #ef4444;
  color: #fff;
}

.tactical-add-row, .kv-add-tactical {
  display: flex;
  gap: 10px;
}

.tactical-add-row input, .kv-add-tactical input, .cyber-textarea, .kv-edit-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.tactical-add-row input:focus, .cyber-textarea:focus, .kv-edit-row input:focus {
  border-color: #6366f1;
  outline: none;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
}

.btn-add-pulse {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.4);
  width: 40px;
  border-radius: 10px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-pulse:hover {
  background: #6366f1;
  color: #fff;
  transform: scale(1.05);
}

/* KV List Editing */
.kv-scroll-list {
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.kv-edit-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.kv-sep { opacity: 0.3; font-weight: 900; }

.btn-remove-tactical {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  color: #f87171;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-remove-tactical:hover {
  background: #ef4444;
  color: #fff;
}

/* Read-only Preview Section */
.module-preview {
  padding: 0 25px 18px 25px;
  opacity: 0.6;
}

.preview-text-hud {
  font-size: 0.8rem;
  font-family: 'Source Code Pro', monospace;
  color: #94a3b8;
  display: block;
}

.tactical-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tactical-tag {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: 'Source Code Pro', monospace;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.tactical-kv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.kv-card-mini {
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.kv-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.kv-val {
  font-size: 0.85rem;
  color: #e2e8f0;
  font-family: 'Source Code Pro', monospace;
}

.tactical-text-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.raw-data {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'Source Code Pro', monospace;
  color: #cbd5e1;
}

/* Modals & Dialogs */
.tactical-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(10px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.delete-dialog {
  max-width: 450px;
  padding: 40px;
  text-align: center;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
}

.error-accent { color: #ef4444; margin: 0 0 15px 0; font-weight: 950; letter-spacing: 2px; }
.dialog-msg { color: #94a3b8; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.5; }

.dialog-actions-tactical {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn-ghost-hud {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-weight: 800;
  letter-spacing: 2px;
  cursor: pointer;
  padding: 12px 20px;
}

.btn-primary-hud {
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 12px 25px;
  border-radius: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
}

.btn-danger-hud {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 12px 25px;
  border-radius: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
}

.glass-morphism {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.card-glass {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.shadow-glow {
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.4);
}

@media (max-width: 600px) {
  .kv-edit-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .kv-sep { display: none; }
  .module-header { padding: 15px; }
  .module-content { padding: 0 15px 15px 15px; }
}
</style>
