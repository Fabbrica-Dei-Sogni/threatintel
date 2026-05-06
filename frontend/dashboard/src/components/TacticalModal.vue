<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay glass-morphism" @click.self="onCancel">
      <div class="modal-container card-glass">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">{{ icon || '⚠️' }}</span>
            <h2 class="modal-title">{{ title.toUpperCase() }}</h2>
          </div>
          <button class="modal-close" @click="onCancel">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <p class="modal-text">{{ message }}</p>
          <slot></slot>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-modal btn-cancel" @click="onCancel">
            {{ cancelLabel || 'ANNULLA' }}
          </button>
          <button class="btn-modal btn-confirm" :class="{ 'btn-danger': isDanger }" @click="onConfirm">
            <span class="btn-glow"></span>
            {{ confirmLabel || 'CONFERMA' }}
          </button>
        </div>

        <!-- Decorative elements -->
        <div class="modal-corner top-left"></div>
        <div class="modal-corner top-right"></div>
        <div class="modal-corner bottom-left"></div>
        <div class="modal-corner bottom-right"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['confirm', 'cancel']);

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(2, 6, 23, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(12px);
}

.modal-container {
  width: 90%;
  max-width: 500px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 35px;
  position: relative;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.modal-icon { font-size: 1.8rem; }

.modal-title {
  font-size: 1.2rem;
  font-weight: 950;
  letter-spacing: 4px;
  margin: 0;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.modal-close {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s;
}

.modal-close:hover { color: #fff; }

.modal-body {
  margin-bottom: 35px;
}

.modal-text {
  font-size: 1rem;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.btn-modal {
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-confirm {
  position: relative;
  background: #6366f1;
  border: none;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
}

.btn-confirm.btn-danger {
  background: #ef4444;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
}

.btn-confirm:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.btn-glow {
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.btn-confirm:hover .btn-glow { opacity: 1; }

/* Corners */
.modal-corner {
  position: absolute;
  width: 15px; height: 15px;
  border-color: rgba(99, 102, 241, 0.4);
  border-style: solid;
}

.top-left { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-top-left-radius: 24px; }
.top-right { top: -1px; right: -1px; border-width: 2px 2px 0 0; border-top-right-radius: 24px; }
.bottom-left { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; border-bottom-left-radius: 24px; }
.bottom-right { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-bottom-right-radius: 24px; }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>
