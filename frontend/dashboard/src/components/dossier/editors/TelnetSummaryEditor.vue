<template>
  <div class="dossier-editor telnet-summary-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.sessionId')">
          <el-input v-model="modelValue.sessionId" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.timeWindow')">
          <el-input v-model="modelValue.timeWindow" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.origin')">
          <el-input v-model="modelValue.origin" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.eventsCount')">
          <el-input-number v-model="modelValue.totalEvents" :min="0" controls-position="right" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ITelnetSummarySectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: ITelnetSummarySectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
