import { test, createHumanCursor, showOverlay, withOverlay, resetCursor } from '@argo-video/cli'
import { rahmenKarte } from '@starsmedia/anleitung'

test('__SLUG__', async ({ page, narration }) => {
  // argo schreibt sich zum Aufnehmen eine eigene Playwright-Konfiguration und
  // liest playwright.config.ts dabei nicht. Ohne diese Zeile gelten dreissig
  // Sekunden, und der Lauf bricht mitten in der Anleitung ab.
  test.setTimeout(10 * 60 * 1000)

  await page.goto('/')
  const cursor = await createHumanCursor(page, { seed: '__SLUG__', size: 30, start: { x: 0.5, y: 0.25 } })

  await narration.startRecording(page)

  // Titelkarte: Ziel und Kernpunkte, Texte aus anleitungen.json
  narration.mark('intro')
  await rahmenKarte(page, { art: 'intro', slug: '__SLUG__', cursor })
  await page.waitForTimeout(narration.durationFor('intro'))

  await page.goto('/')

  narration.mark('erster-schritt')
  await withOverlay(page, 'erster-schritt', async () => {
    // Knoepfe ueber ihre Beschriftung suchen, nie ueber eine feste Zahl aus
    // den Daten: Bestaende und Summen aendern sich zwischen zwei Laeufen.
    await cursor.click(page.getByRole('button', { name: /Weiter/ }))
    await page.waitForTimeout(Math.max(0, narration.durationFor('erster-schritt') - 1200))
  })

  // Schlusskarte: dieselben Punkte noch einmal
  narration.mark('outro')
  await rahmenKarte(page, { art: 'outro', slug: '__SLUG__', cursor })
  await page.waitForTimeout(narration.durationFor('outro'))

  await cursor.dispose()
  await resetCursor(page)
})
