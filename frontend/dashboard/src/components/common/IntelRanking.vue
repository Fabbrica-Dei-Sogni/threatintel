<template>
  <div class="intel-ranking-widget glass-card" :class="[itemStyle, { collapsed: isCollapsed }]">
    <!-- Widget Header -->
    <div class="widget-header" :class="{ 'clickable-header': collapsible }" @click="handleHeaderClick">
      <div class="title-content">
        <h3>{{ title.toUpperCase() }}</h3>
        <!-- Slot for meta information (More info links, etc.) -->
        <div v-if="$slots['title-meta']" class="title-meta">
          <slot name="title-meta"></slot>
        </div>
      </div>
      
      <div class="header-actions" @click.stop>
        <!-- Total Results Indicator -->
        <div v-if="total > 0" class="header-total">
          {{ t('common.total').toUpperCase() }}: {{ total }}
        </div>

        <!-- Inline Pagination (Header) -->
        <div v-if="total > 0 && !isCollapsed" class="mini-pagination">
          <button class="pag-btn" :disabled="page <= 1" @click="handlePageChange(page - 1)">«</button>
          <span class="pag-info">{{ page }} / {{ totalPages }}</span>
          <button class="pag-btn" :disabled="page >= totalPages" @click="handlePageChange(page + 1)">»</button>
        </div>
        
        <!-- Slot for extra actions (ProtocolSelector, etc.) -->
        <slot name="header-actions"></slot>
        
        <span v-if="collapsible" class="arrow" :class="{ open: !isCollapsed }"></span>
      </div>
    </div>

    <!-- Extra Content Slot (Maps, Charts, etc.) -->
    <transition name="collapse">
      <div v-if="$slots['extra-content'] && !isCollapsed" class="extra-content-wrapper">
        <slot name="extra-content"></slot>
      </div>
    </transition>

    <!-- Filters Bar Slot -->
    <div v-if="$slots.filters && !isCollapsed" class="filters-bar">
      <slot name="filters"></slot>
    </div>

    <!-- List Body -->
    <transition name="collapse">
      <div v-show="!isCollapsed" class="ranking-body">
        <ul class="ranking-list" :class="{ 'has-rank': showRank }">
          <li v-for="(item, index) in displayedItems" :key="getItemKey(item, index)" class="ranking-item">
            <div v-if="showRank" class="rank-indicator" :class="getRankClass(index)">
              <span class="rank-num">#{{ (page - 1) * parseInt(internalLimit) + (index + 1) }}</span>
            </div>
            
            <div class="item-main-content">
              <slot name="item" :item="item" :index="index"></slot>
            </div>
            
            <div v-if="detailRouteName" class="item-details-action">
               <router-link :to="getDetailLink(item)" class="detail-btn" :title="t('common.detail')">
                 👁️
               </router-link>
            </div>
          </li>
          
          <!-- Empty State -->
          <li v-if="items.length === 0 && !loading" class="no-data">
            {{ emptyText || t('common.noDataFound') }}
          </li>
        </ul>
        
        <!-- Loading / Error -->
        <div v-if="loading" class="ranking-loading">
          <div class="loader-pulse"></div>
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-if="error" class="ranking-error">
          {{ t('common.errorLoadingData') }}
        </div>

        <!-- Footer Pagination -->
        <div v-if="total > 0 && !isCollapsed" class="footer-pagination">
          <div class="pag-controls">
            <button class="pag-btn large" :disabled="page <= 1" @click="handlePageChange(page - 1)">
              {{ t('common.prev').toUpperCase() }}
            </button>
            <div class="page-numbers">
               <span class="current-page">{{ page }}</span>
               <span class="separator">/</span>
               <span class="total-pages">{{ totalPages }}</span>
            </div>
            <button class="pag-btn large" :disabled="page >= totalPages" @click="handlePageChange(page + 1)">
              {{ t('common.next').toUpperCase() }}
            </button>
          </div>
          <div class="total-indicator">
            {{ t('common.total').toUpperCase() }}: {{ total }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  defaultLimit: { type: [Number, String], default: 10 },
  limitOptions: { type: Array, default: () => ['3', '5', '10', '20', '50', 'all'] },
  itemStyle: { type: String, default: '' },
  showRank: { type: Boolean, default: true },
  collapsible: { type: Boolean, default: true },
  initialCollapsed: { type: Boolean, default: false },
  detailRouteName: { type: String, default: '' },
  detailRouteParam: { type: String, default: 'id' },
  detailItemKey: { type: String, default: 'id' },
  emptyText: { type: String, default: '' },
  showLimitSelector: { type: Boolean, default: true },
  page: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 20 }
});

const emit = defineEmits(['update:limit', 'update:page', 'row-click']);

const isCollapsed = ref(props.initialCollapsed);
const internalLimit = ref(props.pageSize.toString());

// Sync internalLimit with pageSize prop
watch(() => props.pageSize, (newVal) => {
  internalLimit.value = newVal.toString();
});

const handleHeaderClick = () => {
  if (props.collapsible) {
    isCollapsed.value = !isCollapsed.value;
  }
};

const handleLimitChange = (opt) => {
  internalLimit.value = opt.toString();
  emit('update:limit', opt === 'all' ? 1000 : parseInt(opt));
  emit('update:page', 1); // Reset to first page when limit changes
};

const handlePageChange = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return;
  emit('update:page', newPage);
};

const totalPages = computed(() => {
  if (!props.total || !parseInt(internalLimit.value)) return 1;
  return Math.ceil(props.total / parseInt(internalLimit.value));
});

const displayedItems = computed(() => {
  // If we have total, it means the items are already paginated by the parent
  if (props.total > 0) return props.items;
  
  if (internalLimit.value === 'all') return props.items;
  const limit = parseInt(internalLimit.value);
  return props.items.slice(0, limit);
});

const getItemKey = (item, index) => {
  const keys = props.detailItemKey.split('.');
  let val = item;
  for (const k of keys) {
    val = val ? val[k] : undefined;
  }
  return val || item._id || item.id || index;
};

const getRankClass = (index) => {
  const cardinalIndex = (props.page - 1) * parseInt(internalLimit.value) + index;
  if (cardinalIndex === 0) return 'gold';
  if (cardinalIndex === 1) return 'silver';
  if (cardinalIndex === 2) return 'bronze';
  return 'standard';
};

const getDetailLink = (item) => {
  const params = {};
  // Support nested keys like 'request.ip'
  const keys = props.detailItemKey.split('.');
  let val = item;
  for (const k of keys) {
    val = val ? val[k] : undefined;
  }
  params[props.detailRouteParam] = val || item.id || item._id;
  return { name: props.detailRouteName, params };
};

watch(internalLimit, (newLimit) => {
  emit('update:limit', newLimit);
});
</script>

<style scoped src="./IntelRanking.css"></style>
<style src="./IntelRanking.css"></style>

<!-- Surgical fix for Slot Content (More info button) -->
<style scoped>
:deep(.btn-ranking-action) {
  /* Aligned with Classic .btn-action livery */
  background: linear-gradient(135deg, #1E3799, #0C2461);
  color: #E0E7FF;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 20px; /* Aligned with .btn-action */
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-top: 10px;
  box-shadow: 0 4px 15px rgba(12, 36, 97, 0.6);
  border: none;
}

:deep(.btn-ranking-action:hover) {
  background: linear-gradient(135deg, #4A69BD, #1E3799);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(74, 105, 189, 0.4);
}
</style>

<!-- Global/External scoping for Skin-Aware buttons -->
<style>
.skin-cyber .btn-ranking-action {
  background: transparent !important;
  color: #00ffff !important;
  border: 1px solid #00ffff !important;
  padding: 10px 22px !important;
  border-radius: 0 !important;
  font-weight: 800 !important;
  font-family: var(--font-cyber) !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  cursor: pointer;
  transition: all 0.2s ease !important;
  box-shadow: none !important;
  margin-top: 10px;
}

.skin-cyber .btn-ranking-action:hover {
  background: #00ffff !important;
  color: #0a0e17 !important;
  box-shadow: 0 0 20px #00ffff !important;
  transform: translateY(-2px) !important;
}
</style>


