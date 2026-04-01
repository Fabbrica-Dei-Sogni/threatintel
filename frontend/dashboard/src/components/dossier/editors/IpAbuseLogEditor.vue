<template>
  <div class="dossier-editor ip-abuse-log-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.date')">
          <el-date-picker
            v-model="modelValue.date"
            type="datetime"
            format="DD/MM/YYYY HH:mm:ss"
            value-format="DD/MM/YYYY HH:mm:ss"
            size="small"
          />
        </el-form-item>
        <el-form-item :label="t('dossierSections.reporter')">
          <el-input v-model="modelValue.reporter" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.categories')" class="full-width">
          <el-input v-model="modelValue.categories" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.comment')" class="full-width">
          <el-input
            v-model="modelValue.comment"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpAbuseLogSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpAbuseLogSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
