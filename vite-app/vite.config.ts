import { defineConfig } from 'vite'
import { CONFIG } from './src/config'

export default defineConfig({
  base: '/montecarlo/',
  define: {
    __APP_VERSION__: JSON.stringify(CONFIG.version),
  },
})


