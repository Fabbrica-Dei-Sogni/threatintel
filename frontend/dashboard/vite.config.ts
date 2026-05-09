import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const basePath = env.VITE_APP_BASE_PATH || '/honeypot/';

    return {
        base: basePath,
        plugins: [
            vue(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: 'auto',
                includeAssets: ['honey.png'],
                manifest: {
                    name: 'Threat Intel Dashboard',
                    short_name: 'ThreatIntel',
                    description: 'Honeypot Monitoring Dashboard',
                    theme_color: '#1a1a1a',
                    background_color: '#1a1a1a',
                    display: 'standalone',
                    scope: basePath,
                    start_url: basePath,
                    orientation: 'any',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any'
                        },
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'maskable'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any'
                        }
                    ]
                },
                workbox: {
                    // Impedisce al Service Worker di gestire rotte esterne alla app Vue (API)
                    navigateFallbackDenylist: [new RegExp(`^${basePath.replace(/\//g, '\\/')}api`)]
                }
            })
        ],
        build: {
            sourcemap: false,
        },
        resolve: {
            alias: {
                '@': '/src',
            },
        },
    };
});
