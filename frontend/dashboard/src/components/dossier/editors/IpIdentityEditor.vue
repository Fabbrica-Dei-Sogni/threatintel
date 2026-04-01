<template>
  <div class="dossier-editor ip-identity-editor">
    <el-form label-position="top">
      <el-form-item :label="t('dossierSections.ip')">
        <el-input v-model="modelValue.ip" class="big-input-slim" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
<style scoped>
.big-input-slim :deep(.el-input__inner) {
  font-size: 1.2rem !important;
  font-weight: 900 !important;
  height: 40px !important;
  text-align: center;
  color: #818cf8 !important;
  letter-spacing: 2px;
}
</style>
