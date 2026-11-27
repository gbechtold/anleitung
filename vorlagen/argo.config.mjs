import { defineConfig, engines } from '@argo-video/cli'
import konfig from './anleitung.config.mjs'

// Piper spricht immer ueber die Bruecke. VoiceStudio nur dann, wenn eine
// Einstellung mitmuss, die argo nicht kennt.
const ueberBruecke =
  konfig.stimme?.motor !== 'voicestudio' ||
  konfig.stimme?.seed != null ||
  konfig.stimme?.fuehrung != null ||
  konfig.stimme?.haltung != null

export default defineConfig({
  baseURL: konfig.basisUrl,
  demosDir: 'anleitungen',
  outputDir: 'videos',

  tts: {
    // VoiceStudio spricht selbst OpenAI-Art, auf Port 3900, mit
    // response_format pcm bei 24 kHz. Genau das erwartet argo, also geht der
    // Weg direkt. Piper braucht die Bruecke aus "anleitung stimme".
    engine: engines.openai({
      // Direkt zu VoiceStudio, wenn nichts einzustellen ist. Sobald Seed,
      // Fuehrung oder Haltung im Spiel sind, fuehrt der Weg ueber die Bruecke:
      // argo sendet diese Felder nicht mit.
      baseUrl: ueberBruecke
        ? `http://127.0.0.1:${konfig.stimme?.port ?? 3901}/v1`
        : `${konfig.stimme?.url ?? 'http://127.0.0.1:3900'}/v1`,
      model: konfig.stimme?.modell ?? (konfig.stimme?.motor === 'voicestudio' ? 'omnivoice' : 'piper'),
      apiKey: 'lokal',
      timeoutMs: 900_000,
    }),
    defaultVoice: konfig.stimme?.name ?? 'kerstin-medium',
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
