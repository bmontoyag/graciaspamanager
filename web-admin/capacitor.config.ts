import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.graciaspa.manager',
  appName: 'Gracias Spa Manager',
  webDir: 'out',
  server: {
    url: 'https://graciaspa.duckdns.org',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
