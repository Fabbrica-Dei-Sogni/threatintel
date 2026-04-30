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
  <div class="dossier-editor attack-technique-editor">
    <el-form label-position="top">
      <el-form-item :label="t('dossierSections.techniques')">
        <el-input v-model="modelValue.tech" class="tech-input-slim" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackTechniqueData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IAttackTechniqueData;
}>();
</script>

<style scoped src="./editors.css"></style>
<style scoped>
.tech-input-slim :deep(.el-input__inner) {
  background: rgba(16, 185, 129, 0.05) !important;
  color: #10b981 !important;
  font-weight: 800 !important;
}
</style>
