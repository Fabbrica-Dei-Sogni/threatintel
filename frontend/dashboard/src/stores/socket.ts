import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
    const socket = ref<Socket | null>(null);
    const connected = ref(false);
    const lastEvent = ref<any>(null);

    function connect() {
        if (socket.value) return;

        // In produzione l'URL è lo stesso del frontend o definito in env
        const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
        
        socket.value = io(apiBaseUrl, {
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 5000,
            transports: ['websocket', 'polling']
        });

        socket.value.on('connect', () => {
            connected.value = true;
            console.log('[Socket] Connesso al server real-time');
        });

        socket.value.on('disconnect', () => {
            connected.value = false;
            console.warn('[Socket] Disconnesso dal server real-time');
        });

        socket.value.on('error', (err) => {
            console.error('[Socket] Errore connessione:', err);
        });
    }

    function disconnect() {
        if (socket.value) {
            socket.value.disconnect();
            socket.value = null;
            connected.value = false;
        }
    }

    return {
        socket,
        connected,
        lastEvent,
        connect,
        disconnect
    };
});
