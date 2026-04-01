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
