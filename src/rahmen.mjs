/**
 * The two frame cards every walkthrough opens and closes with: the goal and
 * the key points, in the Stars Media house style, with the logo.
 *
 * The texts come from anleitungen/anleitungen.json, so the card, the
 * documentation page and the overview always say the same thing. Writing them
 * into the drehbuch by hand is how they start to differ.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { karteZeigen } from './karte.mjs'

let gemerkt = null

async function laden(wurzel = process.cwd()) {
  if (gemerkt) return gemerkt
  const konfigPfad = join(wurzel, 'anleitung.config.mjs')
  const listePfad = join(wurzel, 'anleitungen', 'anleitungen.json')
  const konfig = existsSync(konfigPfad) ? (await import(pathToFileURL(konfigPfad).href)).default : {}
  const liste = existsSync(listePfad) ? JSON.parse(readFileSync(listePfad, 'utf8')) : []
  gemerkt = { konfig, liste }
  return gemerkt
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {object} o
 * @param {'intro'|'outro'} o.art
 * @param {string} o.slug
 * @param {{hide:()=>Promise<void>}} [o.cursor] wird versteckt, solange die Karte
 *   steht: ein Zeiger auf einer Titelkarte sieht aus wie ein Versehen.
 */
export async function rahmenKarte(page, { art, slug, cursor }) {
  if (cursor) await cursor.hide()
  const { konfig, liste } = await laden()
  const nummer = liste.findIndex((a) => a.datei === slug) + 1
  const eintrag = liste[nummer - 1] ?? {}
  const karte = eintrag.karte ?? {}

  const punkte = art === 'intro' ? (karte.punkte ?? []) : (karte.merksaetze ?? karte.punkte ?? [])
  if (!punkte.length) {
    throw new Error(
      `Die ${art}-Karte von ${slug} hat keine Kernpunkte. Ohne sie zeigt das Video eine leere Karte. ` +
        'Ergaenze karte.punkte in anleitungen/anleitungen.json.',
    )
  }

  await karteZeigen(page, {
    art,
    label:
      art === 'intro'
        ? karte.label ?? `Anleitung ${nummer}${konfig.plattform ? ` · ${konfig.plattform}` : ''}`
        : karte.labelOutro ?? 'Zusammengefasst',
    titel: art === 'intro' ? eintrag.titel ?? slug : karte.schluss ?? eintrag.titel ?? slug,
    punkte,
    fuss: art === 'intro' ? konfig.adresse ?? '' : konfig.adresse ? `Alle Anleitungen: ${konfig.adresse}` : '',
  })
}
