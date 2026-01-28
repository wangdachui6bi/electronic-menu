import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.menu.app',
  appName: '我的菜单',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
