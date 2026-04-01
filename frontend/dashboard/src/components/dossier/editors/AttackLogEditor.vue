<template>
  <div class="dossier-editor attack-log-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.timestamp')">
          <el-input v-model="modelValue.timestamp" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.severity')">
          <el-input-number v-model="modelValue.score" :precision="1" :step="0.1" :min="0" :max="10" controls-position="right" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.method')">
          <el-select v-model="modelValue.method" size="small">
            <el-option v-for="m in ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.url')" class="full-width">
          <el-input v-model="modelValue.url" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.indicators')" class="full-width">
          <el-input v-model="modelValue.indicators" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.userAgent')" class="full-width">
          <el-input v-model="modelValue.userAgent" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.payload')" class="full-width">
          <el-input v-model="modelValue.payload" type="textarea" :rows="8" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IAttackLogSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IAttackLogSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
