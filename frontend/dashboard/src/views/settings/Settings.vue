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
  <div class="settings-container" :class="'skin-' + dashboardSkin" v-if="authStore.isAdmin">
    <GlobalHeader context="settings">
      <template #actions>
        <button class="back-btn" @click="goBack" :title="t('common.back')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </template>
      <template #title>
        <h1 class="page-title">{{ t('nav.settings') }}</h1>
      </template>
    </GlobalHeader>
    <div class="settings-layout">
      <!-- Profiles Section (Sidebar on Desktop, Top-scroll on Mobile) -->
      <aside class="profiles-navigator">
        <div class="nav-header">
          <div class="header-icon">🛡️</div>
          <div class="header-text">
            <h3>{{ t('settings.profiles').toUpperCase() }}</h3>
            <span class="count-badge">{{ profileStore.profiles.length + 1 }} NODI</span>
          </div>
        </div>

        <div class="profile-scroll-area">
          <ul class="profile-fan">
            <li :class="{ active: isDefault }" @click="profileStore.setActiveProfile(null)"
              class="profile-card glass-morphism">
              <div class="node-indicator"></div>
              <div class="profile-info">
                <span class="label">{{ t('settings.defaultProfile').toUpperCase() }}</span>
                <span class="status">PRIMARY</span>
              </div>
            </li>

            <li v-for="p in profileStore.profiles" :key="p.id"
              :class="{ active: profileStore.activeProfileId === p.id }" @click="profileStore.setActiveProfile(p.id)"
              class="profile-card glass-morphism">
              <div class="node-indicator"></div>
              <div class="profile-info">
                <span class="label">{{ p.name.toUpperCase() }}</span>
                <span class="status">SECONDARY</span>
              </div>
            </li>
          </ul>
        </div>

        <button class="btn btn-new-node pulse-glow" @click="createNewProfile">
          <span class="icon">+</span> {{ t('settings.newProfile').toUpperCase() }}
        </button>
      </aside>

      <!-- Editor Profilo -->
      <!-- Node Editor Section -->
      <main class="editor-main-card glass-morphism">
        <div class="editor-header">
          <div class="header-accent-line" :style="{ backgroundColor: isDefault ? '#3b82f6' : '#6366f1' }"></div>
          <div class="header-content">
            <h2 class="editor-title">
              {{ isDefault ? t('settings.defaultProfileTitle') : t('settings.editProfileTitle') }}
            </h2>
            <span class="node-id-chip">UUID: {{ profileStore.activeProfileId || 'DEFAULT' }}</span>
          </div>
        </div>

        <div class="editor-body scrollable-body">
          <section class="config-hub">
            <div class="hub-header">
              <span class="hub-icon">📋</span>
              <h3 class="section-title">{{ t('settings.generalInfo').toUpperCase() }}</h3>
            </div>

            <div class="grid-inputs">
              <div class="setting-item cyber-input-group">
                <label for="name">{{ t('settings.honeypotName') }}</label>
                <div class="input-wrapper">
                  <input type="text" id="name" v-model="form.name" :placeholder="t('settings.honeypotName')" />
                  <div class="focus-border"></div>
                </div>
              </div>

              <div class="setting-item cyber-input-group">
                <label for="apiUrl">{{ t('settings.apiUrl') }}</label>
                <div class="input-wrapper">
                  <input type="text" id="apiUrl" v-model="form.apiUrl" :placeholder="t('settings.apiUrl')" />
                  <div class="focus-border"></div>
                </div>
                <p class="help-text">{{ t('settings.apiUrlHelp') }}</p>
              </div>
            </div>
          </section>

          <section class="config-hub location-hub">
            <div class="hub-header">
              <span class="hub-icon">📍</span>
              <h3 class="section-title">{{ t('settings.locationGeoloc').toUpperCase() }}</h3>
            </div>

            <div class="geo-panel">
              <div class="geo-controls">
                <label>{{ t('settings.configFromIp') }}</label>
                <div class="cyber-search-group">
                  <input type="text" v-model="ipToGeolocate" :placeholder="t('settings.configFromIp')"
                    @keyup.enter="handleGeolocate" />
                  <button class="btn btn-action-icon" @click="handleGeolocate" :disabled="isGeolocating">
                    <span v-if="isGeolocating" class="spinner-tiny"></span>
                    <span v-else>🔍</span>
                  </button>
                </div>
                <p class="help-text">{{ t('settings.geolocHelp') }}</p>

                <div class="coords-manual">
                  <div class="mini-input">
                    <label>{{ t('settings.latitude') }}</label>
                    <input type="number" v-model.number="form.lat" step="0.0001" />
                  </div>
                  <div class="mini-input">
                    <label>{{ t('settings.longitude') }}</label>
                    <input type="number" v-model.number="form.lon" step="0.0001" />
                  </div>
                </div>
              </div>

              <div class="map-view-card">
                <div ref="mapContainer" class="cyber-map"></div>
                <div class="map-overlay-info">{{ t('settings.mapHelp') }}</div>
              </div>
            </div>
          </section>

          <section class="config-hub pwa-hub" v-if="canInstallPwa">
            <div class="hub-header">
              <span class="hub-icon">📲</span>
              <h3 class="section-title">{{ t('settings.appPwa').toUpperCase() }}</h3>
            </div>
            <div class="pwa-tactical-card glass-card">
              <div class="pwa-text">
                <h4>{{ t('settings.installDashboard') }}</h4>
                <p>{{ t('settings.installHelp') }}</p>
              </div>
              <button class="btn btn-upgrade pulse-cobalt" @click="handleInstallPwa">
                {{ t('settings.installApp') }}
              </button>
            </div>
          </section>
        </div>

        <footer class="editor-actions">
          <button v-if="!isDefault" class="btn btn-danger-minimal" @click="handleDelete">
            🗑️ {{ t('settings.deleteProfile') }}
          </button>
          <div class="flex-spacer"></div>
          <button v-if="!isDefault" class="btn btn-ghost" @click="resetForm">{{ t('common.cancel') }}</button>
          <button v-else class="btn btn-ghost" @click="resetToDefault">{{ t('settings.resetToFactory') }}</button>
          <button class="btn btn-primary btn-save shadow-glow" @click="handleSave">
            💾 {{ t('settings.saveProfile').toUpperCase() }}
          </button>
        </footer>

        <div v-if="successMessage" class="success-msg">{{ successMessage }}</div>
        <div v-if="error" class="error-msg">{{ error }}</div>
      </main>
    </div>
  </div>
  <div v-else class="settings-container forbidden-view">
    <div class="error-hud card-glass">
      <span class="error-icon">🚫</span>
      <p class="error-text">ACCESSO NEGATO: PERMESSI INSUFFICIENTI</p>
      <button class="btn btn-hud-action" @click="goBack">TORNA AL CRUSCOTTO</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../stores/profiles';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icons in production
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import GlobalHeader from '../../components/GlobalHeader.vue';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

// Override default icon configuration
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const router = useRouter();
const profileStore = useProfileStore();
const authStore = useAuthStore();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);
const { t } = useI18n();

const successMessage = ref('');
const error = ref('');

const isDefault = computed(() => !profileStore.activeProfileId || profileStore.activeProfileId === 'default');

const form = reactive({
  name: '',
  apiUrl: '',
  lat: 0,
  lon: 0
});

const ipToGeolocate = ref('');
const isGeolocating = ref(false);

const resetForm = () => {
  const p = profileStore.activeProfile;
  form.name = p.name;
  form.apiUrl = p.apiUrl;
  form.lat = p.lat;
  form.lon = p.lon;
  ipToGeolocate.value = '';
};

onMounted(resetForm);
watch(() => profileStore.activeProfileId, resetForm);

// PWA Logic
const canInstallPwa = ref(!!(window as any).deferredPwaPrompt);
const isAppInstalled = ref(!!(window as any).isPwaInstalled);

const handleInstallPwa = async () => {
  const promptEvent = (window as any).deferredPwaPrompt;
  if (!promptEvent) return;

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === 'accepted') {
    (window as any).deferredPwaPrompt = null;
    canInstallPwa.value = false;
  }
};

const createNewProfile = () => {
  const id = profileStore.addProfile({
    name: t('settings.newProfile'),
    apiUrl: profileStore.activeProfile.apiUrl,
    lat: 0,
    lon: 0
  });
  profileStore.setActiveProfile(id);
};

const handleGeolocate = async () => {
  if (!ipToGeolocate.value) {
    error.value = t('settings.errorIp');
    return;
  }

  isGeolocating.value = true;
  error.value = '';

  try {
    const response = await fetch(`https://ipinfo.io/${ipToGeolocate.value}/json`);
    if (!response.ok) throw new Error(t('settings.errorIpData'));

    const data = await response.json();
    if (data.loc) {
      const [lat, lon] = data.loc.split(',').map(Number);
      form.lat = lat;
      form.lon = lon;

      // Nome significativo: Priorità hostname -> city+org -> org
      let name = '';
      if (data.hostname && !data.hostname.includes(data.ip)) {
        name = data.hostname;
      } else if (data.city && data.org) {
        name = `${data.city} (${data.org.split(' ').slice(1).join(' ')})`;
      } else {
        name = data.org || data.city || t('settings.newProfile');
      }
      form.name = name;

      successMessage.value = t('settings.successGeoloc');
      setTimeout(() => successMessage.value = '', 3000);
    } else {
      throw new Error(t('settings.errorCoordsNotFound'));
    }
  } catch (err: any) {
    error.value = err.message || t('settings.errorGeolocalizing');
  } finally {
    isGeolocating.value = false;
  }
};

const handleDelete = () => {
  if (confirm(t('settings.deleteConfirm', { name: form.name }))) {
    profileStore.deleteProfile(profileStore.activeProfileId!);
  }
};

// Map implementation
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let marker: L.Marker | null = null;

const initMap = () => {
  if (!mapContainer.value) return;
  if (map) return;

  map = L.map(mapContainer.value, {
    center: [form.lat || 0, form.lon || 0],
    zoom: 2,
    minZoom: 1,
    attributionControl: false
  });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    noWrap: true
  }).addTo(map);

  marker = L.marker([form.lat || 0, form.lon || 0], {
    draggable: true
  }).addTo(map);

  marker.on('dragend', (e) => {
    const { lat, lng } = (e.target as L.Marker).getLatLng();
    form.lat = Number(lat.toFixed(4));
    form.lon = Number(lng.toFixed(4));
  });

  map.on('click', (e) => {
    const { lat, lng } = (e as L.LeafletMouseEvent).latlng;
    form.lat = Number(lat.toFixed(4));
    form.lon = Number(lng.toFixed(4));
    marker?.setLatLng([lat, lng]);
  });
};

onMounted(() => {
  initMap();
  window.addEventListener('pwa-prompt-available', () => {
    canInstallPwa.value = true;
  });

  window.addEventListener('pwa-installed-success', () => {
    isAppInstalled.value = true;
    canInstallPwa.value = false;
  });
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

// Watch for external coordinate changes to update map
watch([() => form.lat, () => form.lon], ([newLat, newLon]) => {
  if (map && marker) {
    const currentLatLng = marker.getLatLng();
    if (currentLatLng.lat !== newLat || currentLatLng.lng !== newLon) {
      marker.setLatLng([newLat, newLon]);
      map.panTo([newLat, newLon]);
    }
  }
});

const handleSave = () => {
  error.value = '';
  successMessage.value = '';

  if (!form.name || !form.apiUrl) {
    error.value = t('settings.errorRequired');
    return;
  }

  // Pass activeProfileId directly. The store will handle 'default' -> new entry conversion
  profileStore.updateProfile(profileStore.activeProfileId, { ...form });
  successMessage.value = t('settings.successSave');

  setTimeout(() => {
    successMessage.value = '';
  }, 2000);
};

const resetToDefault = () => {
  if (confirm(t('settings.resetConfirm'))) {
    localStorage.removeItem('api_url');
    window.location.reload();
  }
};

function goBack() {
  router.push('/settings');
}
</script>

<style scoped>
.settings-container {
  padding: 20px 30px;
  min-height: 100vh;
  color: #e0e7ff;
  background-color: #020617;
  display: flex;
  flex-direction: column;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.back-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: translateX(-3px);
}

/* Layout Grid */
.settings-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
}

/* Profiles Navigator */
.profiles-navigator {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 5px;
}

.header-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5));
}

.header-text h3 {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 2px;
  margin: 0;
  color: #94a3b8;
}

.count-badge {
  font-size: 0.65rem;
  font-weight: 900;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.profile-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
}

.profile-fan {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-card {
  padding: 15px 20px;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.node-indicator {
  width: 6px;
  height: 35px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  transition: all 0.3s;
}

.profile-info {
  display: flex;
  flex-direction: column;
}

.profile-info .label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 1px;
}

.profile-info .status {
  font-size: 0.65rem;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 1.5px;
}

.profile-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(8px);
  border-color: rgba(99, 102, 241, 0.2);
}

.profile-card.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(30, 41, 59, 0.4));
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.profile-card.active .node-indicator {
  background: #6366f1;
  box-shadow: 0 0 15px #6366f1;
}

.profile-card.active .label {
  color: #fff;
}

.btn-new-node {
  background: rgba(16, 185, 129, 0.1);
  border: 1px dashed rgba(16, 185, 129, 0.4);
  color: #10b981;
  padding: 15px;
  border-radius: 16px;
  font-weight: 800;
  letter-spacing: 2px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-new-node:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  transform: translateY(-2px);
}

/* Editor Card */
.editor-main-card {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.editor-header {
  padding: 25px 35px;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
}

.editor-title {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 2px;
  margin: 0 0 5px 0;
  color: #fff;
}

.node-id-chip {
  font-size: 0.65rem;
  color: #64748b;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
}

.scrollable-body {
  flex: 1;
  padding: 35px;
  overflow-y: auto;
}

.config-hub {
  margin-bottom: 40px;
}

.hub-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 25px;
}

.hub-icon {
  font-size: 1.2rem;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 3px;
  color: #94a3b8;
  margin: 0;
}

.grid-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

.cyber-input-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #64748b;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px 18px;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s;
}

.input-wrapper input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(99, 102, 241, 0.4);
}

.focus-border {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: #6366f1;
  transition: all 0.4s ease;
  transform: translateX(-50%);
}

.input-wrapper input:focus~.focus-border {
  width: 80%;
}

.help-text {
  font-size: 0.75rem;
  color: #475569;
  margin-top: 8px;
  font-style: italic;
}

/* Geo Panel */
.geo-panel {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 25px;
  background: rgba(255, 255, 255, 0.02);
  padding: 25px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.cyber-search-group {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 20px;
}

.cyber-search-group input {
  background: transparent;
  border: none;
  padding: 10px 15px;
  color: #fff;
  flex: 1;
}

.btn-action-icon {
  background: #1e293b;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  transition: all 0.2s;
}

.btn-action-icon:hover {
  background: #334155;
  transform: scale(1.05);
}

.coords-manual {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.mini-input {
  flex: 1;
}

.mini-input label {
  font-size: 0.6rem;
  font-weight: 800;
  color: #475569;
  margin-bottom: 5px;
  display: block;
}

.mini-input input {
  width: 100%;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px 12px;
  color: #94a3b8;
  font-family: monospace;
}

.map-view-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cyber-map {
  height: 320px;
  width: 100%;
  filter: grayscale(0.5) contrast(1.1) brightness(0.8);
}

.map-overlay-info {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(5px);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.65rem;
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

/* PWA */
.pwa-tactical-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
}

.pwa-text h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  color: #fff;
}

.pwa-text p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.btn-upgrade {
  padding: 12px 25px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

/* Actions */
.editor-actions {
  padding: 25px 35px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 15px;
}

.flex-spacer {
  flex: 1;
}

.btn-danger-minimal {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 10px 15px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}

.btn-danger-minimal:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: #64748b;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 700;
}

.btn-primary.btn-save {
  background: linear-gradient(to right, #6366f1, #3b82f6);
  color: #fff;
  border: none;
  padding: 14px 30px;
  border-radius: 12px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
}

/* Glassmorphism Generic */
.glass-morphism {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Progress & MSGs */
.success-msg {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  animation: slide-in 0.3s ease-out;
  z-index: 2000;
}

.error-msg {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #ef4444;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  animation: slide-in 0.3s ease-out;
  z-index: 2000;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 1100px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .profiles-navigator {
    background: rgba(15, 23, 42, 0.4);
    padding: 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .nav-header {
    padding: 0;
  }

  .profile-scroll-area {
    width: 100%;
    overflow-x: visible;
  }

  .profile-fan {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .profile-card {
    min-width: 0;
    /* Allow shrinking */
  }

  .btn-new-node {
    width: 100%;
    max-width: 300px;
    align-self: center;
  }
}

@media (max-width: 768px) {
  .settings-container {
    padding: 15px;
  }

  .profile-fan {
    grid-template-columns: 1fr;
  }

  .geo-panel {
    grid-template-columns: 1fr;
    padding: 15px;
  }

  .grid-inputs {
    grid-template-columns: 1fr;
  }

  .editor-actions {
    flex-direction: column-reverse;
    margin-top: 1rem;
    padding: 20px;
  }

  .editor-body {
    padding: 20px;
  }

  .settings-map {
    height: 200px;
  }
}
</style>
