<template>
  <div class="protocol-badge" :class="[dashboardSkin, protocolClass]">
    <span class="protocol-icon">{{ protocolIcon }}</span>
    <span class="protocol-text">{{ protocol?.toUpperCase() }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const props = defineProps({
  protocol: { type: String, default: 'http' }
});

const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const protocolIcon = computed(() => {
  const p = props.protocol?.toLowerCase();
  if (p === 'https') return '🔒';
  if (p === 'ssh') return '📟';
  if (p === 'telnet') return '⌨️';
  if (p === 'ftp') return '📁';
  if (p === 'smtp') return '📧';
  if (p === 'cowrie') return '🍯';
  return '🌐'; // Default for http or others
});

const protocolClass = computed(() => {
  return `proto-${props.protocol?.toLowerCase() || 'unknown'}`;
});
</script>

<style scoped>
.protocol-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  user-select: none;
}

.protocol-icon {
  font-size: 0.9rem;
}

/* Base Protocol Colors */
.proto-http { color: #5FA5FF; border-color: rgba(95, 165, 255, 0.3); }
.proto-https { color: #00FF41; border-color: rgba(0, 255, 65, 0.3); }
.proto-ssh { color: #FF00FF; border-color: rgba(255, 0, 255, 0.3); }
.proto-telnet { color: #FFA500; border-color: rgba(255, 165, 0, 0.3); }
.proto-cowrie { color: #f39c12; border-color: rgba(243, 156, 18, 0.3); }
.proto-unknown { color: #94a3b8; border-color: rgba(148, 163, 184, 0.3); }

/* Skin Overrides */
.skin-cyber {
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
  text-shadow: 0 0 8px currentColor;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  border-width: 1px;
}

.skin-cyber:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px currentColor;
  background: rgba(255, 255, 255, 0.05);
}

.skin-classic {
  border-radius: 20px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.skin-classic.proto-http { color: #2563eb; }
.skin-classic.proto-https { color: #16a34a; }
.skin-classic.proto-ssh { color: #9333ea; }
.skin-classic.proto-telnet { color: #d97706; }
</style>
