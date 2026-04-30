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
  <div class="dossier-editor ip-geo-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.country')">
          <el-input v-model="modelValue.country" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.city')">
          <el-input v-model="modelValue.city" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.timezone')">
          <el-input v-model="modelValue.timezone" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.coordinates')" class="full-width">
          <el-input v-model="modelValue.gps" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpGeoSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpGeoSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
