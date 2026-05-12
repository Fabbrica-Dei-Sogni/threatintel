import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { getEnv } from '../config';

export const useSocketStore = defineStore('socket', () => {
    const socket = ref<Socket | null>(null);
    const connected = ref(false);
    const lastError = ref<string | null>(null);

    /**
     * Inizializza la connessione socket.
     * Gestisce automaticamente la determinazione dell'origin e del path.
     */
    function connect() {
        if (socket.value) return;

        // Determinazione URL e Origin per Socket.io
        let fullUrl = getEnv('VITE_APP_API_URL');
        
        if (!fullUrl || fullUrl === "") {
            const envDomain = getEnv('VITE_APP_DOMAIN');
            if (envDomain && envDomain !== "") {
                fullUrl = envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;
            } else {
                fullUrl = window.location.origin;
            }
        }

        // Rimuoviamo il suffix /api se presente: socket.io gestisce il proprio path separatamente
        fullUrl = fullUrl.replace(/\/api$/, '');

        let origin = '';
        try {
            // Estraiamo solo l'ORIGIN per evitare errori di namespace su subpath complessi
            const urlObj = new URL(fullUrl.startsWith('http') ? fullUrl : window.location.origin + fullUrl);
            origin = urlObj.origin;

            const basePath = getEnv('VITE_APP_BASE_PATH') || '/';
            const normalizedPath = (basePath.endsWith('/') ? basePath : basePath + '/') + 'socket.io/';

            socket.value = io(origin, {
                // Utilizziamo il path standard configurato su Nginx/Backend
                path: normalizedPath,
                withCredentials: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 5000,
                transports: ['websocket', 'polling']
            });
        } catch (e) {
            console.error('[Socket] Origin parsing failed, falling back to determined fullUrl');
            socket.value = io(fullUrl, {
                path: (getEnv('VITE_APP_BASE_PATH') || '/') + 'socket.io/',
                withCredentials: true,
                transports: ['websocket', 'polling']
            });
        }

        if (!socket.value) return;

        // Lifecycle Events
        socket.value.on('connect', () => {
            connected.value = true;
            lastError.value = null;
            console.info('[Socket] Channel established');
        });

        socket.value.on('connect_error', (err) => {
            lastError.value = err.message;
            console.error('[Socket] Connection error:', err.message);
        });

        socket.value.on('disconnect', (reason) => {
            connected.value = false;
            if (reason === 'io server disconnect') {
                // Reconnect manuale se il server ha forzato la chiusura
                socket.value?.connect();
            }
            console.warn('[Socket] Channel closed:', reason);
        });
    }

    /**
     * Chiude la connessione e pulisce lo stato.
     */
    function disconnect() {
        if (socket.value) {
            socket.value.disconnect();
            socket.value = null;
            connected.value = false;
            lastError.value = null;
        }
    }

    return {
        socket,
        connected,
        lastError,
        connect,
        disconnect
    };
});
