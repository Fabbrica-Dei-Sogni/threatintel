import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'alessandromodica.com',
  appName: 'ThreatIntel Dashboard',
  webDir: 'dist',
    server: {
    androidScheme: 'https'
  }
};

export default config;
