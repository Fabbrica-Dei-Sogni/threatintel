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
  <div class="dossier-editor scanner-analysis-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.src_ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.scannerOccurrences')">
          <el-input-number v-model="modelValue.totalOccurrences" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.firstSeen')">
          <el-input v-model="modelValue.firstSeen" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.lastSeen')">
          <el-input v-model="modelValue.lastSeen" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.duration')">
          <el-input v-model="modelValue.duration" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IScannerAnalysisSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IScannerAnalysisSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
