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
