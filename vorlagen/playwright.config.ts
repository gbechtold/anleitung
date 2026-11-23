import { defineConfig } from '@playwright/test'
import config from './argo.config.mjs'

// Nur fuer Laeufe von Hand. Beim Aufnehmen schreibt argo sich eine eigene
// Konfiguration und liest diese Datei NICHT: die Zeitgrenze steht deshalb im
// Drehbuch, nicht hier.
const scale = Math.max(1, Math.round(config.video?.deviceScaleFactor ?? 1))

export default defineConfig({
  preserveOutput: 'always',
  timeout: 10 * 60 * 1000,
  projects: [
    {
      name: 'anleitungen',
      testDir: config.demosDir ?? 'anleitungen',
      testMatch: '**/*.demo.ts',
      use: {
        browserName: config.video?.browser ?? 'chromium',
        baseURL: process.env.BASE_URL || config.baseURL,
        viewport: { width: config.video?.width ?? 1600, height: config.video?.height ?? 1000 },
        deviceScaleFactor: scale,
        video: 'off',
      },
    },
  ],
})
