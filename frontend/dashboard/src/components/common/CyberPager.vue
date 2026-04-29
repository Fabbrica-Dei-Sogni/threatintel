<template>
  <div class="cyber-pager" :class="[size, theme]">
    <div class="pager-main">
      <button :disabled="page === 1" @click="changePage(page - 1)" class="pager-nav-btn">
        <span class="btn-icon">◄</span> {{ $t('common.prev') }}
      </button>
      
      <div class="pager-info">
        <div class="info-group">
          <span class="label">{{ $t('common.page') }}</span>
          <span class="current-val">{{ page }}</span>
          <span class="separator">/</span>
          <span class="total-val">{{ totalPages }}</span>
        </div>
        
        <div class="pager-total">
          <span class="total-label">{{ $t('common.total') }}</span>
          <span class="total-num">{{ total }}</span>
        </div>
      </div>

      <button :disabled="page >= totalPages" @click="changePage(page + 1)" class="pager-nav-btn">
        {{ $t('common.next') }} <span class="btn-icon">►</span>
      </button>
    </div>

    <div class="pager-tools" v-if="!simple">
      <div class="page-size-selector">
        <span class="tool-label">{{ $t('common.show') }}:</span>
        <div class="size-options">
          <button v-for="s in [10, 20, 50, 100]" :key="s" 
                  :class="{ active: pageSize === s }"
                  @click="changePageSize(s)"
                  class="size-btn">
            {{ s }}
          </button>
        </div>
      </div>

      <div class="jump-to-page">
        <label :for="inputId">{{ $t('common.goToPage') }}</label>
        <input :id="inputId" type="number" 
               v-model.number="inputPage" :min="1" :max="totalPages" 
               @keyup.enter="jumpToPage" 
               class="pager-input" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, required: true },
  simple: { type: Boolean, default: false },
  size: { type: String, default: 'normal' }, // 'mini', 'normal'
  theme: { type: String, default: 'cyber' }
});

const emit = defineEmits(['update:page', 'update:pageSize', 'change']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const inputPage = ref(props.page);
const inputId = 'pager-input-' + Math.random().toString(36).substr(2, 9);

watch(() => props.page, (newVal) => {
  inputPage.value = newVal;
});

function changePage(p) {
  if (p >= 1 && p <= totalPages.value) {
    emit('update:page', p);
    emit('change', { page: p, pageSize: props.pageSize });
  }
}

function changePageSize(s) {
  emit('update:pageSize', s);
  emit('update:page', 1);
  emit('change', { page: 1, pageSize: s });
}

function jumpToPage() {
  let p = parseInt(inputPage.value);
  if (isNaN(p)) {
    inputPage.value = props.page;
    return;
  }
  if (p < 1) p = 1;
  if (p > totalPages.value) p = totalPages.value;
  changePage(p);
}
</script>

<style scoped>
.cyber-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 20px;
  background: rgba(0, 20, 10, 0.4);
  border: 1px solid var(--theme-border, rgba(0, 255, 65, 0.2));
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  position: relative;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.pager-main {
  display: flex;
  align-items: center;
  gap: 15px;
}

.pager-nav-btn {
  background: rgba(var(--theme-primary-rgb, 0, 255, 65), 0.1);
  border: 1px solid var(--theme-primary, #00FF41);
  color: var(--theme-primary, #00FF41);
  padding: 6px 16px;
  cursor: pointer;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
}

.pager-nav-btn:hover:not(:disabled) {
  background: var(--theme-primary, #00FF41);
  color: #000;
  box-shadow: 0 0 15px var(--theme-primary, #00FF41);
  transform: translateY(-1px);
}

.pager-nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.2);
  color: #666;
  clip-path: none;
}

.pager-info {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.9rem;
  color: #fff;
  padding: 0 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.info-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-total {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 15px;
  border-left: 1px dashed rgba(255, 255, 255, 0.2);
}

.total-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  opacity: 0.5;
  letter-spacing: 1px;
}

.total-num {
  color: var(--theme-primary, #00FF41);
  font-weight: 900;
  text-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 0, 255, 65), 0.4);
}

.current-val {
  color: var(--theme-primary, #00FF41);
  font-weight: 900;
  text-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 0, 255, 65), 0.5);
}

.separator {
  opacity: 0.4;
}

.total-val {
  opacity: 0.7;
}

.pager-tools {
  display: flex;
  align-items: center;
  gap: 30px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  opacity: 0.5;
  letter-spacing: 1px;
}

.size-options {
  display: flex;
  gap: 6px;
}

.size-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  width: 34px;
  height: 26px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.size-btn:hover {
  border-color: var(--theme-primary, #00FF41);
  color: #fff;
}

.size-btn.active {
  background: var(--theme-primary, #00FF41);
  color: #000;
  border-color: var(--theme-primary, #00FF41);
  font-weight: 800;
  box-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 0, 255, 65), 0.3);
}

.jump-to-page {
  display: flex;
  align-items: center;
  gap: 10px;
}

.jump-to-page label {
  font-size: 0.7rem;
  opacity: 0.5;
  text-transform: uppercase;
}

.pager-input {
  width: 55px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(var(--theme-primary-rgb, 0, 255, 65), 0.3);
  color: var(--theme-primary, #00FF41);
  padding: 4px 8px;
  text-align: center;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: bold;
}

.pager-input:focus {
  outline: none;
  border-color: var(--theme-primary, #00FF41);
  box-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 0, 255, 65), 0.2);
}

/* Size Variants */
.cyber-pager.mini {
  padding: 6px 12px;
  gap: 15px;
}

.cyber-pager.mini .pager-nav-btn {
  padding: 4px 10px;
  font-size: 0.7rem;
}

.cyber-pager.mini .pager-info {
  font-size: 0.8rem;
  gap: 10px;
  padding: 0 10px;
}

.cyber-pager.mini .pager-total {
  padding-left: 10px;
  gap: 5px;
}

.cyber-pager.mini .total-label {
  font-size: 0.55rem;
}

/* Responsive layout */
@media (max-width: 1100px) {
  .cyber-pager {
    gap: 15px;
    padding: 10px 15px;
  }
  
  .pager-tools {
    gap: 20px;
  }
}

@media (max-width: 850px) {
  .cyber-pager {
    flex-direction: column;
    align-items: center;
    clip-path: none;
    border-radius: 4px;
    gap: 20px;
  }

  .pager-main {
    width: 100%;
    justify-content: center;
  }

  .pager-tools {
    width: 100%;
    justify-content: center;
    padding-top: 15px;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }
}

@media (max-width: 550px) {
  .pager-main {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .pager-info {
    order: -1;
    width: 100%;
    justify-content: center;
    border: none;
    padding: 5px 0;
    margin-bottom: 5px;
  }

  .pager-nav-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }

  .pager-tools {
    flex-direction: column;
    gap: 15px;
  }

  .page-size-selector {
    flex-direction: column;
    gap: 8px;
  }

  .size-options {
    justify-content: center;
  }
}

@media (max-width: 380px) {
  .pager-info {
    flex-direction: column;
    gap: 5px;
  }

  .pager-total {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
  }
}
</style>
