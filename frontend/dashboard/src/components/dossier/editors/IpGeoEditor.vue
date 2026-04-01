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
