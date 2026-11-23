import { defineConfig, engines } from '@argo-video/cli'
import konfig from './anleitung.config.mjs'

export default defineConfig({
  baseURL: konfig.basisUrl,
  demosDir: 'anleitungen',
  outputDir: 'videos',

  tts: {
    // Der Dienst aus "anleitung stimme". argo spricht OpenAI-Art, dahinter
    // steht Piper oder VoiceStudio.
    engine: engines.openai({
      baseUrl: `http://127.0.0.1:${konfig.stimme?.port ?? 3901}/v1`,
      model: konfig.stimme?.motor ?? 'piper',
      apiKey: 'lokal',
      timeoutMs: 600_000,
    }),
    defaultVoice: konfig.stimme?.name ?? 'thorsten-high',
    defaultSpeed: 1.0,
  },

  video: {
    width: 1600,
    height: 1000,
    fps: 30,
    browser: 'chromium',
    captureMode: 'jpeg-stitch',
    deviceScaleFactor: 2,
    cursorHighlight: { mode: 'click' },
  },

  export: { preset: 'medium', crf: 18 },
  overlays: { autoBackground: true },
})
