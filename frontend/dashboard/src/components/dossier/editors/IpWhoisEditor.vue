<template>
  <div class="dossier-editor ip-whois-editor">
    <el-form label-position="top">
      <el-form-item :label="t('dossierSections.whoisData')">
        <el-input
          v-model="modelValue.rawData"
          type="textarea"
          :rows="12"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { IIpWhoisSectionData } from '../../../models/DossierDTO';

const { t } = useI18n();

defineProps<{
  modelValue: IIpWhoisSectionData;
}>();
</script>

<style scoped src="./editors.css"></style>
