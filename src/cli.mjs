#!/usr/bin/env node
/**
 * anleitung: narrated walkthrough videos and documentation pages from one
 * source per feature.
 *
 *   anleitung init                 scaffold into the current project
 *   anleitung neu <slug> "<Titel>" new drehbuch from the template
 *   anleitung stimme [motor]       the speech endpoint argo talks to
 *   anleitung bauen <slug>         video, then documentation page
 *   anleitung doku <slug>          documentation page only
 *   anleitung proben               voice samples to compare
 *   anleitung entwerfen <name> "<english attributes>"   design a VoiceStudio voice
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const hier = dirname(fileURLToPath(import.meta.url))
const paket = join(hier, '..')
const wurzel = process.cwd()
const [befehl, ...rest] = process.argv.slice(2)

function sagen(text) {
  process.stdout.write(`${text}\n`)
}

function abbrechen(text) {
  process.stderr.write(`${text}\n`)
  process.exit(1)
}

async function konfigLesen() {
  const pfad = join(wurzel, 'anleitung.config.mjs')
  if (!existsSync(pfad)) abbrechen('Keine anleitung.config.mjs hier. Erst "anleitung init" laufen lassen.')
  return (await import(pathToFileURL(pfad).href)).default
}

function laufen(befehl, argumente, umgebung = {}) {
  return new Promise((fertig, scheitern) => {
    const kind = spawn(befehl, argumente, { stdio: 'inherit', env: { ...process.env, ...umgebung } })
    kind.on('error', scheitern)
    kind.on('close', (code) => (code === 0 ? fertig() : scheitern(new Error(`${befehl} endete mit ${code}`))))
  })
}

async function init() {
  const vorlagen = join(paket, 'vorlagen')
  mkdirSync(join(wurzel, 'anleitungen'), { recursive: true })
  mkdirSync(join(wurzel, 'doku'), { recursive: true })

  for (const datei of ['anleitung.config.mjs', 'argo.config.mjs', 'playwright.config.ts', 'mkdocs.yml']) {
    const ziel = join(wurzel, datei)
    if (existsSync(ziel)) {
      sagen(`  bleibt  ${datei}`)
      continue
    }
    copyFileSync(join(vorlagen, datei), ziel)
    sagen(`  neu     ${datei}`)
  }

  const liste = join(wurzel, 'anleitungen', 'anleitungen.json')
  if (!existsSync(liste)) {
    writeFileSync(liste, '[]\n')
    sagen('  neu     anleitungen/anleitungen.json')
  }

  sagen('')
  sagen('Als Naechstes:')
  sagen('  1. anleitung.config.mjs ausfuellen (Adresse der Anwendung, Plattformname, Stimme)')
  sagen('  2. anleitung neu 01-erster-weg "Titel der ersten Anleitung"')
  sagen('  3. anleitung stimme   (in einem zweiten Fenster)')
  sagen('  4. anleitung bauen 01-erster-weg')
}

async function neu() {
  const [slug, titel] = rest
  if (!slug || !titel) abbrechen('Aufruf: anleitung neu <slug> "<Titel>"')
  const konfig = await konfigLesen()
  const vorlage = readFileSync(join(paket, 'vorlagen', 'anleitung.demo.ts'), 'utf8')

  const demo = join(wurzel, 'anleitungen', `${slug}.demo.ts`)
  const szenen = join(wurzel, 'anleitungen', `${slug}.scenes.json`)
  if (existsSync(demo)) abbrechen(`${demo} gibt es schon.`)

  const listePfad = join(wurzel, 'anleitungen', 'anleitungen.json')
  const liste = JSON.parse(readFileSync(listePfad, 'utf8'))
  const nummer = liste.length + 1

  writeFileSync(demo, vorlage.replaceAll('__SLUG__', slug))
  writeFileSync(szenen, `${JSON.stringify([
    { scene: 'intro', text: `In dieser Anleitung geht es um ${titel.toLowerCase()}.` },
    { scene: 'erster-schritt', text: 'Der erste Schritt, in einem Satz gesagt.' },
    { scene: 'outro', text: 'Das war der Weg. Die Schritte stehen noch einmal in der Anleitung.' },
  ], null, 2)}\n`)

  if (!liste.some((a) => a.datei === slug)) {
    liste.push({
      datei: slug,
      titel,
      zielgruppe: konfig.zielgruppen?.[0] ?? 'Alle',
      einleitung: '',
      karte: { label: `Anleitung ${nummer} · ${konfig.plattform ?? ''}`.trim(), punkte: [] },
      schritte: ['Erster Schritt'],
      wennEsHakt: [],
    })
    writeFileSync(listePfad, `${JSON.stringify(liste, null, 2)}\n`)
  }

  sagen(`Angelegt: anleitungen/${slug}.demo.ts und ${slug}.scenes.json, Eintrag ${nummer} in anleitungen.json`)
}

async function stimme() {
  const konfig = existsSync(join(wurzel, 'anleitung.config.mjs')) ? await konfigLesen() : {}
  const motor = rest[0] ?? konfig.stimme?.motor ?? 'piper'
  const { stimmeDienst } = await import('./stimme.mjs')
  stimmeDienst({
    motor,
    port: konfig.stimme?.port ?? 3901,
    einstellungen: {
      modell: konfig.stimme?.modell,
      sprache: konfig.stimme?.sprache ?? 'de',
      seed: konfig.stimme?.seed,
      fuehrung: konfig.stimme?.fuehrung,
      haltung: konfig.stimme?.haltung,
    },
  })
}

async function bauen() {
  const [slug] = rest
  if (!slug) abbrechen('Aufruf: anleitung bauen <slug>')
  await laufen('npx', ['argo', 'pipeline', slug])
  await doku()
}

async function doku() {
  const [slug] = rest
  if (!slug) abbrechen('Aufruf: anleitung doku <slug>')
  const konfig = await konfigLesen()
  const { dokuBauen } = await import('./doku.mjs')
  const ergebnis = await dokuBauen({ slug, wurzel, konfig })
  sagen(`${ergebnis.seite} geschrieben, ${ergebnis.bilder} Bilder.`)
}

async function proben() {
  const { probenLaufen } = await import('./proben.mjs')
  await probenLaufen({ wurzel, argumente: rest })
}

async function entwerfen() {
  const [name, beschreibung] = rest
  if (!name || !beschreibung) {
    abbrechen('Aufruf: anleitung entwerfen <name> "<englische Merkmale>"\n' +
      'VoiceStudio liest nur englische Merkmalswoerter: female, young adult, moderate pitch.')
  }
  const { profilEntwerfen } = await import('./voicestudio.mjs')
  const { profil, instruct, ungelesen } = await profilEntwerfen({ name, beschreibung })
  sagen(`Profil ${profil.id ?? profil.profile_id ?? '?'} angelegt: ${instruct}`)
  if (ungelesen?.length) sagen(`Nicht gelesen: ${ungelesen.join(', ')}`)
}

const befehle = { init, neu, stimme, bauen, doku, proben, entwerfen }

if (!befehl || befehl === 'hilfe' || !befehle[befehl]) {
  sagen(readFileSync(join(paket, 'src', 'cli.mjs'), 'utf8').split('\n').slice(2, 12).join('\n').replace(/^ \* ?/gm, ''))
  process.exit(befehl && !befehle[befehl] ? 1 : 0)
}

befehle[befehl]().catch((fehler) => abbrechen(`Fehlgeschlagen: ${fehler.message}`))
