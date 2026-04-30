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
  <div class="dossier-editor generic-editor">
    <el-form label-position="top">
      <el-form-item :label="t('dossierSections.message')">
        <el-input
          v-model="modelValue.text"
          type="textarea"
          :rows="8"
          :placeholder="t('dossierRecorder.dossierDescPlaceholder')"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { DossierSectionType, type IHumanSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

const props = defineProps<{
  modelValue: IHumanSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
