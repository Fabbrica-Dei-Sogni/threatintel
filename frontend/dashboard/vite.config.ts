import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // Usiamo './' per rendere gli asset relativi e portabili su qualsiasi APP_BASE_PATH
    const base = './';
    const runtimeBasePath = env.VITE_APP_BASE_PATH || '/honeypot/';

    return {
        base: base,
        plugins: [
            vue(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: false,
                includeAssets: ['honey.png', 'pwa-192x192.png', 'pwa-512x512.png'],
                manifest: {
                    id: '/honeypot/',
                    name: 'Threat Intel Dashboard',
                    short_name: 'ThreatIntel',
                    description: 'Honeypot Monitoring Dashboard',
                    theme_color: '#1a1a1a',
                    background_color: '#1a1a1a',
                    display: 'standalone',
                    scope: '/honeypot/',
                    start_url: '/honeypot/',
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
                    // Escludiamo config.js dal precache per gestire la versione runtime correttamente
                    globIgnores: ['**/config.js'],
                    // Impedisce al Service Worker di gestire rotte esterne alla app Vue (API)
                    navigateFallbackDenylist: [new RegExp(`^${runtimeBasePath.replace(/\//g, '\\/')}api`)],
                    runtimeCaching: [
                        {
                            urlPattern: ({ url }) => url.pathname.endsWith('config.js'),
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'runtime-config',
                                expiration: {
                                    maxEntries: 1,
                                },
                                cacheableResponse: {
                                    statuses: [0, 200]
                                }
                            }
                        }
                    ]
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
