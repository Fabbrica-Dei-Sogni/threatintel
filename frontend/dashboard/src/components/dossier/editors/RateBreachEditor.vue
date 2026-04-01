<template>
  <div class="dossier-editor rate-breach-editor">
    <el-form label-position="top">
      <div class="editor-grid">
        <el-form-item :label="t('dossierSections.timestamp')">
          <el-input v-model="modelValue.timestamp" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.ip')">
          <el-input v-model="modelValue.ip" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.limitType')">
          <el-select v-model="modelValue.limitType" size="small" class="full-width">
            <el-option v-for="l in ['ddos-protection', 'critical-endpoints', 'trap-endpoints', 'application']" 
              :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dossierSections.method')">
          <el-select v-model="modelValue.method" size="small">
            <el-option v-for="m in ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dossierSections.url') + ' (PATH)'" class="full-width">
          <el-input v-model="modelValue.path" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.userAgent')" class="full-width">
          <el-input v-model="modelValue.userAgent" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.honeypotId')">
          <el-input v-model="modelValue.honeypotId" />
        </el-form-item>
        <el-form-item :label="t('dossierSections.message')" class="full-width">
          <el-input v-model="modelValue.message" type="textarea" :rows="2" />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IRateBreachSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IRateBreachSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
