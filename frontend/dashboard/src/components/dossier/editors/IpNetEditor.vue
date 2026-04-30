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
  <div class="dossier-editor ip-net-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.organization')">
          <el-input v-model="modelValue.org" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.hostname')" class="full-width">
          <el-input v-model="modelValue.hostname" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpNetSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpNetSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
