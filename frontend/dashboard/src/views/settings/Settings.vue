<template>
  <div class="settings-container">
    <div class="settings-layout">
      <!-- Sidebar Profili -->
      <aside class="profiles-sidebar">
        <div class="sidebar-header">
          <h3>Profili</h3>
          <button class="btn-icon" @click="createNewProfile" title="Nuovo Profilo">+</button>
        </div>
        <ul class="profile-list">
          <li :class="{ active: profileStore.activeProfileId === 'default' || !profileStore.activeProfileId }"
            @click="profileStore.setActiveProfile(null)">
            Bersaglio Default
          </li>
          <li v-for="p in profileStore.profiles" :key="p.id" :class="{ active: profileStore.activeProfileId === p.id }"
            @click="profileStore.setActiveProfile(p.id)">
            {{ p.name }}
            <button class="btn-delete" @click.stop="profileStore.deleteProfile(p.id)">×</button>
          </li>
        </ul>
      </aside>

      <!-- Editor Profilo -->
      <main class="settings-card">
        <div class="settings-header">
          <h2 class="settings-title">{{ isDefault ? 'Profilo Predefinito' : 'Modifica Profilo' }}</h2>
          <button class="close-btn" @click="goBack" title="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="setting-item">
          <label for="name">Nome Honeypot</label>
          <input type="text" id="name" v-model="form.name" placeholder="Esempio: Honeypot Milano" />
        </div>

        <div class="setting-item">
          <label for="apiUrl">API URL</label>
          <input type="text" id="apiUrl" v-model="form.apiUrl" placeholder="https://example.com/honeypot" />
          <p class="help-text">URL del backend per questo profilo.</p>
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

        <div class="actions">
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
import { ref, watch, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../../stores/profiles';

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

const resetForm = () => {
  const p = profileStore.activeProfile;
  form.name = p.name;
  form.apiUrl = p.apiUrl;
  form.lat = p.lat;
  form.lon = p.lon;
};

onMounted(resetForm);
watch(() => profileStore.activeProfileId, resetForm);

const createNewProfile = () => {
  const id = profileStore.addProfile({
    name: 'Nuovo Honeypot',
    apiUrl: profileStore.defaultProfile.apiUrl,
    lat: 0,
    lon: 0
  });
  profileStore.setActiveProfile(id);
};

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.profile-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.profile-list li {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
}

.profile-list li:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.profile-list li.active {
  background-color: var(--primary-color);
  color: white;
}

.btn-icon {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.btn-delete {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
}

.btn-delete:hover {
  opacity: 1;
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
  margin-bottom: 2rem;
}

.settings-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--primary-color);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-color);
}

.setting-item {
  margin-bottom: 1.5rem;
}

.setting-row {
  display: flex;
  gap: 1rem;
}

.setting-row .setting-item {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
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
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
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
