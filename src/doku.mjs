/**
 * The documentation page for one walkthrough, from the same two files the
 * video comes from.
 *
 * The pictures are cut out of the finished video at each scene's own
 * timestamp. Recording them separately would let page and video drift apart,
 * and the drift would be invisible until a customer follows a step that no
 * longer exists.
 */
import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Zeitmarken mit Nachkommastellen in den Millisekunden sind ungueltig; argo 0.42 schreibt sie. */
function untertitelPutzen(text) {
  return text.replace(/(\d\d:\d\d:\d\d[.,]\d{3})\.\d+/g, '$1')
}

export async function dokuBauen({ slug, wurzel = process.cwd(), konfig }) {
  const szenenPfad = join(wurzel, 'anleitungen', `${slug}.scenes.json`)
  const berichtPfad = join(wurzel, '.argo', slug, 'scene-report.json')
  const listePfad = join(wurzel, 'anleitungen', 'anleitungen.json')

  for (const [was, pfad] of [['Szenen', szenenPfad], ['Szenenbericht', berichtPfad], ['Liste', listePfad]]) {
    if (!existsSync(pfad)) throw new Error(`${was} fehlt: ${pfad}`)
  }

  const szenen = JSON.parse(readFileSync(szenenPfad, 'utf8'))
  const bericht = JSON.parse(readFileSync(berichtPfad, 'utf8'))
  const alle = JSON.parse(readFileSync(listePfad, 'utf8'))
  const kopf = alle.find((a) => a.datei === slug)
  if (!kopf) throw new Error(`${slug} fehlt in anleitungen/anleitungen.json. Ohne Titel und Zielgruppe keine Seite.`)

  const video = join(wurzel, bericht.output)
  const zeiten = new Map(bericht.scenes.map((s) => [s.scene, s]))
  const dokuDir = join(wurzel, 'doku')
  mkdirSync(join(dokuDir, 'bilder'), { recursive: true })
  mkdirSync(join(dokuDir, 'videos'), { recursive: true })

  copyFileSync(video, join(dokuDir, 'videos', `${slug}.mp4`))
  for (const spur of ['srt', 'vtt']) {
    const quelle = video.replace(/\.mp4$/, `.${spur}`)
    if (!existsSync(quelle)) continue
    writeFileSync(join(dokuDir, 'videos', `${slug}.${spur}`), untertitelPutzen(readFileSync(quelle, 'utf8')))
  }

  // Die Rahmenkarten sind Marke, kein Schritt: sie gehoeren nicht in die Seite.
  const schritte = szenen.filter((s) => !['intro', 'outro'].includes(s.scene))
  const bilder = []
  for (const [i, szene] of schritte.entries()) {
    const zeit = zeiten.get(szene.scene)
    if (!zeit) throw new Error(`Szene ${szene.scene} fehlt im Bericht, die Seite waere unvollstaendig.`)
    // Gegen Ende der Szene greifen: da ist die Handlung getan, am Anfang steht
    // noch der Zustand davor im Bild.
    const sekunde = Math.max(0, (zeit.startMs + zeit.durationMs * 0.82) / 1000)
    const datei = `bilder/${slug}-${String(i + 1).padStart(2, '0')}-${szene.scene}.png`
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', sekunde.toFixed(2), '-i', video,
      '-frames:v', '1', '-vf', 'scale=1200:-2', join(dokuDir, datei)])
    bilder.push({ datei, sekunde, szene })
  }

  const zeilen = [
    `# ${kopf.titel}`,
    '',
    `**Für wen:** ${kopf.zielgruppe}  `,
    `**Dauer des Videos:** ${Math.round(bericht.totalDurationMs / 1000)} Sekunden  `,
    `**Zuletzt erzeugt:** ${new Date().toISOString().slice(0, 10)} aus \`anleitungen/${slug}.demo.ts\``,
    '',
    kopf.einleitung ?? '',
    '',
    '<video controls preload="metadata" width="100%">',
    `  <source src="videos/${slug}.mp4" type="video/mp4">`,
    `  <track kind="captions" srclang="de" label="Deutsch" src="videos/${slug}.vtt" default>`,
    '</video>',
    '',
    '## Schritt für Schritt',
    '',
  ]

  for (const [i, b] of bilder.entries()) {
    zeilen.push(`### ${i + 1}. ${kopf.schritte?.[i] ?? b.szene.scene}`, '')
    zeilen.push(b.szene.text, '')
    zeilen.push(`![${kopf.schritte?.[i] ?? b.szene.scene}](${b.datei})`, '')
    zeilen.push(`<small>Im Video ab Sekunde ${Math.floor(b.sekunde)}.</small>`, '')
  }

  if (kopf.wennEsHakt?.length) {
    zeilen.push('## Wenn es hakt', '')
    for (const fall of kopf.wennEsHakt) zeilen.push(`- **${fall.fall}** ${fall.antwort}`)
    zeilen.push('')
  }

  writeFileSync(join(dokuDir, `${slug}.md`), zeilen.join('\n'))
  uebersichtSchreiben({ wurzel, alle, konfig })
  return { seite: join(dokuDir, `${slug}.md`), bilder: bilder.length }
}

export function uebersichtSchreiben({ wurzel = process.cwd(), alle, konfig }) {
  const dokuDir = join(wurzel, 'doku')
  const bekannt = new Set(alle.map((a) => a.datei))
  const gebaut = new Set(
    readdirSync(dokuDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
      .filter((f) => bekannt.has(f)), // index.md ist die Uebersicht, keine Anleitung
  )
  const titel = konfig?.plattform ? `Anleitungen ${konfig.plattform}` : 'Anleitungen'
  const zeilen = [`# ${titel}`, '', '| Nr | Anleitung | Für wen | Stand |', '|---|---|---|---|']
  for (const [i, a] of alle.entries()) {
    const fertig = gebaut.has(a.datei)
    zeilen.push(`| ${i + 1} | ${fertig ? `[${a.titel}](${a.datei}.md)` : a.titel} | ${a.zielgruppe} | ${fertig ? 'gebaut' : 'offen'} |`)
  }
  zeilen.push('', `${gebaut.size} von ${alle.length} gebaut.`)
  writeFileSync(join(dokuDir, 'index.md'), zeilen.join('\n'))
  return { gebaut: gebaut.size, gesamt: alle.length }
}
