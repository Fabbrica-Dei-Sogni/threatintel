<template>
  <div class="config-editor">
    <!-- Header con chiave -->
    <div class="config-header" @click="toggleExpanded">
      <div class="config-key-section">
        <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="config-key">{{ configKey }}</span>
        <span class="config-type-badge" :class="valueType">{{ $t(`config.types.${valueType}`) }}</span>
      </div>
      <div class="config-actions" @click.stop>
        <button class="btn-icon btn-edit" @click="startEdit" :title="$t('common.edit')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon btn-delete" @click="confirmDelete" :title="$t('common.delete')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Preview (collapsed) -->
    <div v-if="!isExpanded && !isEditing" class="config-preview">
      <span class="preview-text">{{ previewText }}</span>
    </div>

    <!-- Contenuto espanso -->
    <div v-if="isExpanded && !isEditing" class="config-content">
      <!-- Vista lista/tag -->
      <div v-if="valueType === 'list'" class="tag-container">
        <span v-for="(tag, index) in tags" :key="index" class="tag">{{ tag }}</span>
      </div>

      <!-- Vista chiave:valore -->
      <div v-else-if="valueType === 'keyvalue'" class="keyvalue-container">
        <div v-for="(item, index) in keyValuePairs" :key="index" class="keyvalue-item">
          <span class="kv-key">{{ item.key }}</span>
          <span class="kv-separator">:</span>
          <span class="kv-value">{{ item.value }}</span>
        </div>
      </div>

      <!-- Vista testo semplice -->
      <div v-else class="text-container">
        <p class="text-value">{{ modelValue }}</p>
      </div>
    </div>

    <!-- Modal di editing -->
    <div v-if="isEditing" class="config-editor-modal" @click.self="cancelEdit">
      <div class="editor-content">
        <h3 class="editor-title">{{ $t('config.editConfig') }}: {{ configKey }}</h3>

        <!-- Editor per lista -->
        <div v-if="valueType === 'list'" class="list-editor">
          <div class="tags-edit-container">
            <div v-for="(tag, index) in editTags" :key="index" class="tag-editable">
              <span>{{ tag }}</span>
              <button class="tag-remove" @click="removeTag(index)" :title="$t('common.delete')">×</button>
            </div>
          </div>
          <div class="tag-add-row">
            <input 
              type="text" 
              v-model="newTag" 
              :placeholder="$t('config.addTagPlaceholder')"
              @keyup.enter="addTag"
              class="tag-input"
            />
            <button class="btn btn-accent btn-add-tag" @click="addTag">+</button>
          </div>
        </div>

        <!-- Editor per chiave:valore -->
        <div v-else-if="valueType === 'keyvalue'" class="keyvalue-editor">
          <div class="keyvalue-edit-container">
            <div v-for="(item, index) in editKeyValuePairs" :key="index" class="keyvalue-edit-item">
              <input type="text" v-model="item.key" class="kv-key-input" :placeholder="$t('config.keyPlaceholder')" />
              <span class="kv-separator">:</span>
              <input type="text" v-model="item.value" class="kv-value-input" :placeholder="$t('config.valuePlaceholder')" />
              <button class="btn-icon btn-remove-kv" @click="removeKeyValue(index)">×</button>
            </div>
          </div>
          <div class="kv-add-row">
            <input type="text" v-model="newKvKey" :placeholder="$t('config.keyPlaceholder')" class="kv-key-input" />
            <span class="kv-separator">:</span>
            <input type="text" v-model="newKvValue" :placeholder="$t('config.valuePlaceholder')" class="kv-value-input" @keyup.enter="addKeyValue" />
            <button class="btn btn-accent btn-add-kv" @click="addKeyValue">+</button>
          </div>
        </div>

        <!-- Editor per testo semplice -->
        <div v-else class="text-editor">
          <textarea 
            v-model="editText" 
            :placeholder="$t('config.textPlaceholder')"
            class="text-input"
            rows="4"
          ></textarea>
        </div>

        <!-- Azioni editor -->
        <div class="editor-actions">
          <button class="btn btn-secondary" @click="cancelEdit">{{ $t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
            {{ saving ? $t('common.loading') : $t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog conferma eliminazione -->
    <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-confirm-dialog">
        <h3>{{ $t('config.confirmDeleteTitle') }}</h3>
        <p>{{ $t('config.confirmDeleteMessage', { key: configKey }) }}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">{{ $t('common.cancel') }}</button>
          <button class="btn btn-danger" @click="executeDelete" :disabled="saving">
            {{ saving ? $t('common.loading') : $t('common.delete') }}
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
.config-editor {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.config-editor:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.2s;
}

.config-header:hover {
  background: rgba(255, 255, 255, 0.04);
}

.config-key-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.expand-icon {
  font-size: 0.7rem;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.config-key {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-color);
  font-family: 'Source Code Pro', monospace;
}

.config-type-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.config-type-badge.list {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.config-type-badge.keyvalue {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.config-type-badge.text {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.config-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-color);
}

.btn-edit:hover {
  color: #60a5fa;
}

.btn-delete:hover {
  color: #f87171;
}

.config-preview {
  padding: 0 1.25rem 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.preview-text {
  opacity: 0.8;
}

.config-content {
  padding: 0 1.25rem 1.25rem;
}

/* Tags */
.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: rgba(var(--primary-rgb), 0.15);
  color: var(--primary-color);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: 'Source Code Pro', monospace;
}

/* Key-Value */
.keyvalue-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyvalue-item {
  display: flex;
  align-items: center;
  background: rgba(168, 85, 247, 0.1);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.kv-key {
  color: #c084fc;
  font-weight: 600;
  font-family: 'Source Code Pro', monospace;
}

.kv-separator {
  color: var(--text-muted);
  margin: 0 0.25rem;
}

.kv-value {
  color: var(--text-color);
  font-family: 'Source Code Pro', monospace;
}

/* Text */
.text-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 1rem;
}

.text-value {
  margin: 0;
  color: var(--text-color);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Editor Modal */
.config-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.editor-content {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.editor-title {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
  color: var(--text-color);
}

/* List Editor */
.tags-edit-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.tag-editable {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary-color);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: 'Source Code Pro', monospace;
}

.tag-remove {
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tag-remove:hover {
  opacity: 1;
}

.tag-add-row {
  display: flex;
  gap: 0.5rem;
}

.tag-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  font-size: 0.9rem;
}

.tag-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Key-Value Editor */
.keyvalue-edit-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.keyvalue-edit-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.kv-key-input, .kv-value-input {
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.85rem;
  font-family: 'Source Code Pro', monospace;
}

.kv-key-input {
  width: 40%;
}

.kv-value-input {
  flex: 1;
}

.kv-key-input:focus, .kv-value-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.kv-add-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-remove-kv {
  font-size: 1.2rem;
  color: #f87171;
}

/* Text Editor */
.text-input {
  width: 100%;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  font-size: 0.9rem;
  resize: vertical;
  min-height: 100px;
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Editor Actions */
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

/* Buttons */
.btn {
  padding: 0.65rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-secondary {
  background: transparent;
  border-color: var(--border-color);
  color: var(--text-color);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.btn-accent {
  background-color: #3b82f6;
  color: white;
  padding: 0.65rem 1rem;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-add-tag, .btn-add-kv {
  font-size: 1.2rem;
  line-height: 1;
}

/* Delete Confirm Dialog */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.delete-confirm-dialog {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  text-align: center;
}

.delete-confirm-dialog h3 {
  margin: 0 0 0.75rem;
  color: #f87171;
}

.delete-confirm-dialog p {
  margin: 0 0 1.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

/* Responsive */
@media (max-width: 640px) {
  .config-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .config-actions {
    align-self: flex-end;
  }

  .editor-content {
    padding: 1.25rem;
  }

  .keyvalue-edit-item, .kv-add-row {
    flex-wrap: wrap;
  }

  .kv-key-input {
    width: 100%;
  }
}
</style>
