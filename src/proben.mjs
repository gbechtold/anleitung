/**
 * Voice samples, side by side, with the same sentences.
 *
 * Picking a voice from a product page is guesswork. This renders the same
 * three German sentences with every candidate, writes the files next to each
 * other and builds one page to listen on. What sounds right in a demo
 * sentence can fall apart on numbers, dates and compound words, so the
 * sentences carry all three.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { karteHtml, MARKE } from './karte.mjs'
import { piperSprechen, voicestudioSprechen, PIPER_STIMMEN } from './stimme.mjs'

const run = promisify(execFile)

export const PROBESAETZE = [
  'Im ersten Schritt wählst du die Tickets aus. Die Plätze sind ab dann fünfzehn Minuten reserviert.',
  'Das VIP-Ticket kostet 299 Euro, das Netzwerk-Dinner 89 Euro. Enthalten sind zwanzig und zehn Prozent Umsatzsteuer.',
  'Am 23. April 2027 im Festspielhaus Bregenz. Die Einlasskontrolle funktioniert auch ohne Netz.',
]

async function pcmNachWav(pcm, ziel) {
  // Ueber eine Datei, nicht ueber stdin: execFile kennt keine Eingabe, und
  // ffmpeg wartet dann endlos auf ein Ende, das nie kommt.
  const roh = `${ziel}.pcm`
  await writeFile(roh, pcm)
  try {
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', roh, ziel])
  } finally {
    await rm(roh, { force: true })
  }
}

export async function probenLaufen({ wurzel = process.cwd(), argumente = [] } = {}) {
  const motor = argumente.includes('--voicestudio') ? 'voicestudio' : 'piper'
  const modell = argumente.find((a) => a.startsWith('--modell='))?.split('=')[1]
  // VoiceStudio braucht die Profil-IDs, Piper die Namen aus PIPER_STIMMEN.
  const nurDiese = argumente.find((a) => a.startsWith('--stimmen='))?.split('=')[1]?.split(',')
  const stimmen = nurDiese ?? (motor === 'voicestudio' ? [] : Object.keys(PIPER_STIMMEN))
  if (!stimmen.length) throw new Error('Keine Stimmen genannt. Mit --stimmen=a,b,c aufrufen.')

  const ziel = join(wurzel, 'stimmproben')
  mkdirSync(ziel, { recursive: true })
  const sprechen = motor === 'voicestudio'
    ? async (text, stimme, tempo) => {
        const { sprechen: vs } = await import('./voicestudio.mjs')
        return vs({ text, stimme, tempo, modell: modell ?? 'omnivoice' })
      }
    : piperSprechen

  const ergebnisse = []
  for (const stimme of stimmen) {
    const dateien = []
    for (const [i, satz] of PROBESAETZE.entries()) {
      const name = `${modell ?? motor}-${stimme}-${i + 1}.wav`
      try {
        const t0 = Date.now()
        const pcm = await sprechen(satz, stimme, 1)
        await pcmNachWav(pcm, join(ziel, name))
        dateien.push({ name, satz, sekunden: +(pcm.length / 2 / 24000).toFixed(1), ms: Date.now() - t0 })
      } catch (fehler) {
        dateien.push({ name, satz, fehler: fehler.message })
      }
    }
    ergebnisse.push({ stimme, motor, dateien })
    const ok = dateien.filter((d) => !d.fehler).length
    process.stdout.write(`${stimme}: ${ok} von ${PROBESAETZE.length} Sätzen\n`)
  }

  const seite = join(ziel, 'index.html')
  writeFileSync(seite, probenSeite(await alleProben(ziel)))
  process.stdout.write(`\nZum Anhören: ${seite}\n`)
  return { ziel, ergebnisse }
}

/**
 * Alles, was im Ordner liegt, nicht nur der letzte Lauf. Sonst verschwindet
 * die Stimme von gestern, sobald heute eine neue dazukommt, und vergleichen
 * laesst sich nur noch gegen die Erinnerung.
 */
async function alleProben(ziel) {
  const MOTOREN = ['mlx-audio', 'voicestudio', 'omnivoice', 'cosyvoice', 'voxcpm2', 'piper']
  const namen = await profilNamen()
  const dateien = readdirSync(ziel).filter((f) => f.endsWith('.wav')).sort()
  const gruppen = new Map()
  for (const datei of dateien) {
    const treffer = /^(.*)-(\d+)\.wav$/.exec(datei)
    if (!treffer) continue
    const [, schluessel, nummer] = treffer
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, [])
    gruppen.get(schluessel).push({ name: datei, satz: PROBESAETZE[Number(nummer) - 1] ?? '' })
  }
  return [...gruppen].map(([schluessel, dateien]) => {
    // Der Motorname kann selbst einen Bindestrich tragen, deshalb der laengste
    // passende Anfang und nicht einfach bis zum ersten Strich.
    const motor = MOTOREN.find((m) => schluessel.startsWith(`${m}-`)) ?? schluessel.split('-')[0]
    const kennung = schluessel.slice(motor.length + 1) || schluessel
    return { stimme: namen.get(kennung) ?? kennung, motor, dateien }
  })
}

/** Lesbare Namen der VoiceStudio-Profile, wenn die Anwendung laeuft. */
async function profilNamen() {
  try {
    const { profile } = await import('./voicestudio.mjs')
    const liste = await profile()
    return new Map(liste.map((p) => [p.id ?? p.profile_id, p.name]))
  } catch {
    return new Map()
  }
}

function probenSeite(ergebnisse) {
  const kopf = karteHtml({ art: 'intro', label: 'Stimmprobe', titel: 'Welche Stimme spricht die Anleitungen?', punkte: ['Dieselben drei Sätze je Stimme', 'Zahlen, Datum und Fachwort sind der Test', 'Entscheidung trifft das Ohr, nicht die Beschreibung'], bewegung: false })
  const rumpf = ergebnisse
    .map(
      (e) => `<section>
  <h2>${e.stimme} <span class="motor">${e.motor}</span></h2>
  ${e.dateien
    .map((d) =>
      d.fehler
        ? `<p class="fehler">${d.satz}<br><strong>Fehlgeschlagen:</strong> ${d.fehler}</p>`
        : `<p class="satz">${d.satz}</p><audio controls preload="none" src="${d.name}"></audio>`,
    )
    .join('')}
</section>`,
    )
    .join('')

  return kopf.replace(
    '</body></html>',
    `</body></html>`,
  ).replace(
    '<div class="fuss">',
    `<div class="fuss" style="display:none">`,
  ).replace(
    '</body>',
    `<div class="proben">${rumpf}</div>
<style>
body{display:block;overflow:auto;height:auto;min-height:100%}
.proben{margin-top:6vh;display:flex;flex-direction:column;gap:5vh;max-width:860px}
.proben h2{font-size:26px;font-weight:800;letter-spacing:-.01em;margin-bottom:2.4vh}
.proben h2 .motor{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${MARKE.akzent};margin-left:12px}
.satz{font-size:17px;color:rgba(255,255,255,.86);margin:0 0 10px}
.zahl{font-size:13px;color:rgba(255,255,255,.55);margin:6px 0 22px;font-variant-numeric:tabular-nums}
.fehler{font-size:15px;color:#FF8A7A;margin:0 0 22px}
audio{width:100%;max-width:520px;filter:invert(1) hue-rotate(180deg)}
</style>
</body>`,
  )
}
