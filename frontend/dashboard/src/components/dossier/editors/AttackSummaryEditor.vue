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
  <div class="dossier-editor attack-summary-editor">
    <el-form label-position="top">
      <el-form-item :label="t('dossierSections.defconLevel')">
        <div class="defcon-selector">
          <div 
            v-for="level in [5, 4, 3, 2, 1]" 
            :key="level"
            class="defcon-btn"
            :class="[{ active: modelValue.defcon == level }, `lvl-${level}`]"
            @click="modelValue.defcon = level"
          >
            {{ level }}
          </div>
        </div>
      </el-form-item>
      
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.severity')">
          <el-input-number v-model="modelValue.score" :precision="1" :step="0.1" :min="0" :max="10" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.logsCount')">
          <el-input-number v-model="modelValue.totalLogs" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.duration')">
          <el-input v-model="modelValue.duration" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.rps')">
          <el-input-number v-model="modelValue.rps" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.avgScore')">
          <el-input-number v-model="modelValue.avgScore" :precision="2" :min="0" controls-position="right" />
        </el-form-item>
        
        <el-form-item :label="t('dossierSections.techniques')" class="full-width">
          <el-input v-model="modelValue.techniques" type="textarea" :rows="2" />
        </el-form-item>
        
        <el-form-item :label="t('dossierSections.firstSeen')">
          <el-input v-model="modelValue.firstSeen" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.lastSeen')">
          <el-input v-model="modelValue.lastSeen" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.intensity')">
          <el-input v-model="modelValue.intensity" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackSummarySectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IAttackSummarySectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
