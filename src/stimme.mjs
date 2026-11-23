/**
 * One speech endpoint in the shape argo expects, two engines behind it.
 *
 * argo's OpenAI engine posts to /v1/audio/speech with response_format 'pcm'
 * and then reads the answer as raw 16-bit little-endian mono at 24 kHz
 * (its dist/tts/engines/openai.js). Every engine here converts to exactly
 * that. A wrong sample rate does not raise: the voice simply plays at the
 * wrong pitch and drifts out of the timeline.
 *
 *   anleitung stimme              Piper, offline, the voices under PIPER_VOICES
 *   anleitung stimme voicestudio  VoiceStudio on 127.0.0.1:3900
 */
import { createServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export const PIPER_STIMMEN = {
  'thorsten-high': 'de_DE-thorsten-high.onnx',
  'thorsten-medium': 'de_DE-thorsten-medium.onnx',
  'thorsten-emotional': 'de_DE-thorsten_emotional-medium.onnx',
  'kerstin-medium': 'de_DE-kerstin-medium.onnx',
  'kerstin-low': 'de_DE-kerstin-low.onnx',
  ramona: 'de_DE-ramona-low.onnx',
  eva: 'de_DE-eva_k-x_low.onnx',
}

const PIPER = process.env.PIPER_BIN ?? join(process.env.HOME ?? '', '.local/bin/piper')
const VOICE_DIR = process.env.PIPER_VOICES ?? join(process.env.HOME ?? '', '.local/share/piper-voices')
const VS = process.env.VOICESTUDIO_URL ?? 'http://127.0.0.1:3900'

/** 16-bit PCM aus einer WAV-Datei ziehen und auf 24 kHz mono bringen. */
async function nachPcm(wavPfad) {
  const ziel = `${wavPfad}.pcm`
  await run('ffmpeg', ['-v', 'error', '-y', '-i', wavPfad, '-f', 's16le', '-ar', '24000', '-ac', '1', ziel])
  return readFile(ziel)
}

export async function piperSprechen(text, stimme, tempo = 1) {
  const datei = PIPER_STIMMEN[stimme] ?? PIPER_STIMMEN['thorsten-high']
  const modell = join(VOICE_DIR, datei)
  if (!existsSync(modell)) throw new Error(`Stimme fehlt: ${modell}`)
  const dir = await mkdtemp(join(tmpdir(), 'stimme-'))
  const wav = join(dir, 'clip.wav')
  try {
    await new Promise((fertig, scheitern) => {
      // execFile kennt keine Eingabe; ohne geschlossenes stdin wartet piper ewig.
      const kind = spawn(PIPER, ['-m', modell, '-f', wav, '--length-scale', (1 / (tempo || 1)).toFixed(3)])
      let meldung = ''
      kind.stderr.on('data', (c) => (meldung += c))
      kind.on('error', scheitern)
      kind.on('close', (code) => (code === 0 ? fertig() : scheitern(new Error(`piper ${code}: ${meldung.trim()}`))))
      kind.stdin.end(`${text}\n`)
    })
    return await nachPcm(wav)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function voicestudioSprechen(text, stimme, tempo = 1) {
  // VoiceStudio spricht selbst OpenAI-Art und liefert auf Wunsch rohes PCM mit
  // 24 kHz: dieselbe Form, die argo liest. Es bleibt nichts umzurechnen.
  const { sprechen } = await import('./voicestudio.mjs')
  return sprechen({ text, stimme: stimme ?? 'default', tempo })
}

export function stimmeDienst({ port = 3901, motor = 'piper' } = {}) {
  const sprechen = motor === 'voicestudio' ? voicestudioSprechen : piperSprechen

  const server = createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.endsWith('/audio/speech')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `kein Weg fuer ${req.method} ${req.url}` } }))
      return
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      try {
        const { input, voice, speed } = JSON.parse(body || '{}')
        if (!input?.trim()) throw new Error('kein Text')
        const t0 = Date.now()
        const pcm = await sprechen(input, voice, speed)
        const sekunden = (pcm.length / 2 / 24000).toFixed(1)
        console.log(`${sekunden}s  ${motor}/${voice ?? 'standard'}  ${input.slice(0, 60)}  (${Date.now() - t0}ms)`)
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': pcm.length })
        res.end(pcm)
      } catch (fehler) {
        console.error('Fehlgeschlagen:', fehler.message)
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: fehler.message } }))
      }
    })
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`Stimme auf http://127.0.0.1:${port}/v1  (${motor})`)
  })
  return server
}
