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
  <div class="dossier-editor ip-abuse-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.abuseScore')">
          <el-input-number v-model="modelValue.score" :min="0" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.isListed')">
          <el-switch v-model="modelValue.listed" active-color="#ef4444" inactive-color="#10b981" size="small" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.reportsCount')">
          <el-input-number v-model="modelValue.total" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.lastReport')" class="full-width">
          <el-date-picker
            v-model="modelValue.lastReport"
            type="datetime"
            format="DD/MM/YYYY HH:mm:ss"
            value-format="DD/MM/YYYY HH:mm:ss"
            size="small"
          />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpAbuseSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpAbuseSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
<style scoped>
:deep(.cyber-input-number .el-input__inner) { text-align: left !important; }
:deep(.cyber-date-picker) { width: 100% !important; }
</style>
