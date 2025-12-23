<template>
  <div class="settings-container">
    <div class="settings-layout">
      <!-- Sidebar Profili -->
      <aside class="profiles-sidebar">
        <div class="sidebar-header">
          <h3>Profili</h3>
        </div>
        <ul class="profile-list">
          <li :class="{ active: profileStore.activeProfileId === 'default' || !profileStore.activeProfileId }"
            @click="profileStore.setActiveProfile(null)">
            <span class="profile-name">Bersaglio Default</span>
          </li>
          <li v-for="p in profileStore.profiles" :key="p.id" :class="{ active: profileStore.activeProfileId === p.id }"
            @click="profileStore.setActiveProfile(p.id)">
            <span class="profile-name">{{ p.name }}</span>
          </li>
        </ul>
        <button class="btn btn-outline btn-full btn-new-profile" @click="createNewProfile">
          <span>+ Nuovo Profilo</span>
        </button>
      </aside>

      <!-- Editor Profilo -->
      <main class="settings-card">
        <div class="settings-header">
          <div class="header-left">
            <button class="back-btn" @click="goBack" title="Indietro">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h2 class="settings-title">{{ isDefault ? 'Profilo Predefinito' : 'Modifica Profilo' }}</h2>
          </div>
        </div>

        <section class="settings-section">
          <h3 class="section-title">Informazioni Generali</h3>
          <div class="setting-item">
            <label for="name">Nome Honeypot</label>
            <input type="text" id="name" v-model="form.name" placeholder="Esempio: Honeypot Milano" />
          </div>

          <div class="setting-item">
            <label for="apiUrl">API URL</label>
            <input type="text" id="apiUrl" v-model="form.apiUrl" placeholder="https://example.com/honeypot" />
            <p class="help-text">URL del backend per questo profilo.</p>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="section-title">Posizione e Geolocalizzazione</h3>

          <div class="geolocation-tool">
            <div class="setting-item">
              <label>Configura da IP (automatico)</label>
              <div class="input-group">
                <input type="text" v-model="ipToGeolocate" placeholder="Inserisci IP (es: 8.8.8.8)"
                  @keyup.enter="handleGeolocate" />
                <button class="btn btn-accent" @click="handleGeolocate" :disabled="isGeolocating">
                  {{ isGeolocating ? 'Ricerca...' : 'Trova Posizione' }}
                </button>
              </div>
              <p class="help-text">Recupera coordinate e nome dal servizio ipinfo.</p>
            </div>

            <div class="map-selection-wrapper">
              <label>Selezione sulla Mappa</label>
              <div ref="mapContainer" class="settings-map"></div>
              <p class="help-text">Clicca sulla mappa o trascina il marker per impostare le coordinate.</p>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-item">
              <label for="lat">Latitudine</label>
              <input type="number" id="lat" v-model.number="form.lat" step="0.0001" />
            </div>
            <div class="setting-item">
              <label for="lon">Longitudine</label>
              <input type="number" id="lon" v-model.number="form.lon" step="0.0001" />
            </div>
          </div>
        </section>

        <div class="actions">
          <button v-if="!isDefault" class="btn btn-danger btn-delete-profile" @click="handleDelete">Elimina
            Profilo</button>
          <div class="spacer"></div>
          <button v-if="!isDefault" class="btn btn-secondary" @click="resetForm">Annulla</button>
          <button v-else class="btn btn-secondary" @click="resetToDefault">Reset a Fabbrica</button>
          <button class="btn btn-primary" @click="handleSave">Salva Profilo</button>
        </div>

        <div v-if="successMessage" class="success-msg">{{ successMessage }}</div>
        <div v-if="error" class="error-msg">{{ error }}</div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../stores/profiles';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const router = useRouter();
const profileStore = useProfileStore();

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

const createNewProfile = () => {
  const id = profileStore.addProfile({
    name: 'Nuovo Honeypot',
    apiUrl: profileStore.activeProfile.apiUrl,
    lat: 0,
    lon: 0
  });
  profileStore.setActiveProfile(id);
};

const handleGeolocate = async () => {
  if (!ipToGeolocate.value) {
    error.value = 'Inserisci un indirizzo IP';
    return;
  }

  isGeolocating.value = true;
  error.value = '';

  try {
    const response = await fetch(`https://ipinfo.io/${ipToGeolocate.value}/json`);
    if (!response.ok) throw new Error('Errore nel recupero dati IP');

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
        name = data.org || data.city || 'Honeypot Remoto';
      }
      form.name = name;

      successMessage.value = 'Coordinate e nome recuperati!';
      setTimeout(() => successMessage.value = '', 3000);
    } else {
      throw new Error('Coordinate non trovate per questo IP');
    }
  } catch (err: any) {
    error.value = err.message || 'Errore durante la geolocalizzazione';
  } finally {
    isGeolocating.value = false;
  }
};

const handleDelete = () => {
  if (confirm(`Sei sicuro di voler eliminare il profilo "${form.name}"?`)) {
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
    error.value = 'Nome e API URL sono richiesti';
    return;
  }

  // Pass activeProfileId directly. The store will handle 'default' -> new entry conversion
  profileStore.updateProfile(profileStore.activeProfileId, { ...form });
  successMessage.value = 'Profilo salvato correttamente!';

  setTimeout(() => {
    successMessage.value = '';
  }, 2000);
};

const resetToDefault = () => {
  if (confirm('Sei sicuro di voler resettare il profilo predefinito ai valori iniziali?')) {
    localStorage.removeItem('api_url');
    window.location.reload();
  }
};

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push('/');
};
</script>

<style scoped>
.settings-container {
  padding: 2rem;
  min-height: 100vh;
  color: var(--text-color);
  background-color: var(--bg-color);
}

.settings-layout {
  display: flex;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.profiles-sidebar {
  flex: 0 0 250px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
}

.sidebar-header {
  margin-bottom: 1.5rem;
}

.profile-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
}

.profile-list li {
  padding: 0.85rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
  background-color: rgba(255, 255, 255, 0.02);
}

.profile-list li:hover {
  background-color: rgba(255, 255, 255, 0.05);
  transform: translateX(4px);
}

.profile-list li.active {
  background: linear-gradient(135deg, var(--primary-color), #2d5a27);
  color: white;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.profile-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-new-profile {
  margin-top: auto;
  border-style: dashed;
}

.settings-card {
  flex: 1;
  background-color: var(--card-bg);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.back-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(-2px);
}

.settings-section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--border-color), transparent);
}

.setting-item {
  margin-bottom: 1.5rem;
}

.setting-row {
  display: flex;
  gap: 1.5rem;
}

.setting-row .setting-item {
  flex: 1;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group input {
  flex: 1;
}

.geolocation-tool {
  background-color: rgba(var(--primary-rgb), 0.05);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(var(--primary-rgb), 0.1);
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.map-selection-wrapper {
  flex: 1;
}

.settings-map {
  height: 250px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
  z-index: 1;
}

label {
  display: block;
  margin-bottom: 0.6rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
}

input {
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 0.95rem;
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
  background-color: rgba(var(--primary-rgb), 0.02);
}

.help-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
}

.error-msg {
  color: #ff4d4d;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.success-msg {
  color: #4CAF50;
  margin-top: 1rem;
  text-align: center;
  font-weight: bold;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.spacer {
  flex: 1;
}

.btn {
  padding: 0.75rem 1.75rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.25);
}

.btn-secondary {
  background-color: transparent;
  border-color: var(--border-color);
  color: var(--text-color);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.btn-accent {
  background-color: #3b82f6;
  color: white;
}

.btn-danger {
  background-color: rgba(255, 77, 77, 0.1);
  border-color: rgba(255, 77, 77, 0.2);
  color: #ff4d4d;
}

.btn-danger:hover {
  background-color: #ff4d4d;
  color: white;
}

.btn-outline {
  background: transparent;
  border-color: var(--border-color);
  color: var(--text-color);
}

.btn-full {
  width: 100%;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .profiles-sidebar {
    flex: none;
  }
}
</style>
