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
