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
  <div class="dossier-editor telnet-timeline-row-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.timestamp')">
          <el-input v-model="modelValue.timestamp" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.eventName')">
          <el-input v-model="modelValue.eventName" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.message')" class="full-width">
          <el-input v-model="modelValue.message" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.details')" class="full-width">
          <el-input v-model="modelValue.details" type="textarea" :rows="2" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ITelnetTimelineRowData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: ITelnetTimelineRowData;
}>();
</script>

<style scoped src="./editors.css"></style>
