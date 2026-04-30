<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
    <header class="global-header" :class="[skinClass, contextClass, extraClass]">
        <div class="header-left">
            <div class="brand-logo" @click="goToHome">
                <span class="logo-icon">🛰️</span>
                <div class="logo-text-group">
                    <span class="logo-text">THREAT<span class="highlight">INTEL</span></span>
                    <span class="logo-version">v{{ version }}</span>
                </div>
            </div>
            
            <div class="title-separator" v-if="$slots.title"></div>
            <div class="header-title-area" v-if="$slots.title">
                <slot name="title"></slot>
            </div>
        </div>

        <div class="header-actions">
            <slot name="actions"></slot>
            <SkinSwitcher />
            <LanguageSwitcher />
        </div>
    </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useViewSettingsStore } from '../stores/viewSettings';
import { storeToRefs } from 'pinia';
import LanguageSwitcher from './LanguageSwitcher.vue';
import SkinSwitcher from './SkinSwitcher.vue';

const props = defineProps({
    context: {
        type: String,
        default: 'default'
    },
    extraClass: {
        type: String,
        default: ''
    }
});

const router = useRouter();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const version = import.meta.env.VITE_APP_VERSION || '0.1.0';

const skinClass = computed(() => `skin-${dashboardSkin.value}`);
const contextClass = computed(() => `context-${props.context}`);

const goToHome = () => {
    router.push('/');
};
</script>

<style scoped>
.global-header {
    /* Fallback variables if not provided by context */
    --header-primary: var(--theme-primary, #00D4FF);
    --header-accent: var(--theme-accent, #007AFF);
    --header-border: var(--theme-border, rgba(0, 212, 255, 0.2));
    --header-bg: var(--theme-surface, rgba(0, 0, 0, 0.2));
    
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    row-gap: 10px;
    padding: 16px 40px;
    z-index: 1000;
    background: var(--header-bg);
    border-bottom: 1px solid var(--header-border);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    max-width: 100%;
    overflow-x: hidden;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 24px;
}

.brand-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: opacity 0.2s;
}

.brand-logo:hover {
    opacity: 0.8;
}

.logo-icon {
    font-size: 1.8rem;
}

.logo-text-group {
    display: flex;
    flex-direction: column;
    line-height: 1;
}

.logo-text {
    font-weight: 900;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #fff;
}

.logo-text .highlight {
    color: var(--header-primary);
    text-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 0, 212, 255), 0.5);
}

.logo-version {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--header-primary);
    opacity: 0.7;
    margin-top: 2px;
    font-family: monospace;
}

.header-title-area {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
}

.title-separator {
    width: 1px;
    height: 24px;
    background: var(--header-border);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
}

/* Specific Context Adaptations if needed via CSS */
.global-header.context-auth {
    padding: 24px 40px; /* Auth pages usually want a more airy header */
}

@media (max-width: 768px) {
    .global-header {
        padding: 10px 15px;
        flex-wrap: wrap; 
        gap: 10px;
        overflow-x: hidden;
    }
    
    .header-left {
        gap: 12px;
    }

    .brand-logo {
        gap: 0;
    }

    .logo-icon {
        font-size: 1.4rem;
    }

    .logo-text-group {
        display: none; /* Hidden by default on small screens */
    }

    /* Show logo text on mobile ONLY in Home context */
    .global-header.context-home .logo-text-group {
        display: flex;
    }
    
    .title-separator {
        display: none;
    }

    .header-actions {
        gap: 6px;
        flex-wrap: wrap; 
        justify-content: flex-end;
        flex: 1;
    }

    .header-actions::-webkit-scrollbar {
        display: none;
    }

    :deep(.header-actions button),
    :deep(.header-actions .btn-action),
    :deep(.header-actions .back-btn),
    :deep(.header-actions .dashboard-back-btn) {
        padding: 4px 8px !important;
        font-size: 0.65rem !important;
        height: 28px !important;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: unset !important;
    }

    /* Hide long button text on very small screens, keeping only symbols/icons if possible */
    @media (max-width: 480px) {
        :deep(.header-actions button span:not(.icon)),
        :deep(.header-actions button text) {
            display: none;
        }
    }

    .header-title-area {
        flex-shrink: 1;
        min-width: 0;
        gap: 10px;
    }

    :deep(.header-title-area h1) {
        font-size: 0.75rem !important;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    :deep(.header-title-area h1)::after {
        font-size: 0.8rem;
    }
}

@media (max-width: 480px) {
    .global-header {
        justify-content: space-between; /* Keep logo and actions separated */
    }
    
    .header-left {
        width: auto;
        border-bottom: none;
        padding-bottom: 0;
    }

    .header-actions {
        width: auto;
        padding-top: 0;
    }
}
</style>
