<template>
  <div class="intel-ranking-widget glass-card" :class="[itemStyle, { collapsed: isCollapsed }]">
    <!-- Widget Header -->
    <div class="widget-header" :class="{ 'clickable-header': collapsible }" @click="handleHeaderClick">
      <div class="title-content">
        <h3>{{ title.toUpperCase() }}</h3>
      </div>
      
      <div class="header-actions" @click.stop>
        <!-- Limit Selector (Tabs) -->
        <div v-if="showLimitSelector" class="limit-tabs">
          <button 
            v-for="opt in limitOptions" 
            :key="opt"
            class="limit-tab"
            :class="{ active: internalLimit === opt }"
            @click="internalLimit = opt"
          >
            {{ opt === 'all' ? (t('common.all') || 'ALL') : opt }}
          </button>
        </div>
        
        <!-- Slot for extra actions (ProtocolSelector, etc.) -->
        <slot name="header-actions"></slot>
        
        <span v-if="collapsible" class="arrow" :class="{ open: !isCollapsed }"></span>
      </div>
    </div>

    <!-- List Body -->
    <transition name="collapse">
      <div v-show="!isCollapsed" class="ranking-body">
        <ul class="ranking-list" :class="{ 'has-rank': showRank }">
          <li v-for="(item, index) in displayedItems" :key="getItemKey(item, index)" class="ranking-item">
            <div v-if="showRank" class="rank-indicator" :class="getRankClass(index)">
              <span class="rank-num">#{{ index + 1 }}</span>
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
  showLimitSelector: { type: Boolean, default: true }
});

const emit = defineEmits(['update:limit', 'row-click']);

const isCollapsed = ref(props.initialCollapsed);
const internalLimit = ref(props.defaultLimit.toString());

const handleHeaderClick = () => {
  if (props.collapsible) {
    isCollapsed.value = !isCollapsed.value;
  }
};

const displayedItems = computed(() => {
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
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
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
