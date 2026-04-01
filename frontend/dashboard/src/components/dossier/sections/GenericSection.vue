<template>
  <div class="generic-section">
    <div class="text-content">
      {{ data.text || renderedText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IGenericSectionData } from '../../../models/DossierDTO';

defineProps<{
  data: IGenericSectionData;
  renderedText?: string;
}>();
</script>

<style scoped>
.generic-section {
  padding: 10px 0;
  color: #e2e8f0;
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 0.95rem;
}
</style>
