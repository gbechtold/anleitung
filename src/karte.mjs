/**
 * The title card at the top and tail of every walkthrough, in the Stars Media
 * house style (AGENTS.md section 14): three colours, Figtree, the 80x4 rule as
 * the only ornament, no shadows and no rounded corners.
 *
 * The card is drawn into the page itself with setContent, not composited
 * afterwards. That keeps one recorder, one timeline and one place where the
 * pacing is decided. Font and logo are embedded, so a card renders the same
 * with the network off.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hier = dirname(fileURLToPath(import.meta.url))
const assets = join(hier, '..', 'assets')

const schrift = readFileSync(join(assets, 'figtree-latin.woff2')).toString('base64')
const logoRoh = readFileSync(join(assets, 'starsmedia-logo.svg'), 'utf8').trim()

export const MARKE = {
  tinte: '#20282A',
  grund: '#FFFFFF',
  akzent: '#00FFC3',
  flaeche: '#F2F5F4',
  rahmenHell: '#C9D2D0',
  rahmenDunkel: '#4A5254',
}

function entschaerfen(text) {
  return String(text ?? '').replace(/[&<>]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[z])
}

/**
 * @param {object} k
 * @param {'intro'|'outro'} k.art
 * @param {string} k.label    kleine Zeile ueber dem Titel, z.B. "Anleitung 1 von 14"
 * @param {string} k.titel    das Ziel des Videos, ein Satz
 * @param {string[]} k.punkte die Kernpunkte, drei bis vier
 * @param {string} [k.fuss]   Fusszeile, z.B. die Adresse der Doku
 * @param {boolean} [k.bewegung] Einblenden. Im Video ja, fuer ein Standbild nein:
 *   ein Schnappschuss trifft sonst die Animation in ihrem ersten Bild und
 *   liefert eine leere Karte.
 */
export function karteHtml({ art, label, titel, punkte = [], fuss, bewegung = true }) {
  const logo = logoRoh.replace('<svg ', '<svg class="logo" ')
  const liste = punkte
    .map((p, i) => `<li style="animation-delay:${0.45 + i * 0.12}s">${entschaerfen(p)}</li>`)
    .join('')

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<style>
@font-face{font-family:Figtree;src:url(data:font/woff2;base64,${schrift}) format('woff2');font-weight:300 900;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  background:${MARKE.tinte}; color:#FFFFFF; overflow:hidden;
  font-family:Figtree, ui-sans-serif, "Helvetica Neue", Helvetica, Arial, sans-serif;
  display:flex; flex-direction:column; justify-content:space-between;
  padding:5.2vh 6vw; line-height:1.5;
}
.logo{width:clamp(120px,11vw,168px);height:auto;color:#FFFFFF;display:block}
.kopf{animation:auf .5s ease-out both}
.mitte{max-width:62ch}
.label{
  font-size:clamp(11px,1.05vw,14px); font-weight:700; letter-spacing:2.4px;
  text-transform:uppercase; color:rgba(255,255,255,.70); margin-bottom:2.2vh;
  animation:auf .5s ease-out .15s both;
}
h1{
  font-size:clamp(30px,4.3vw,62px); font-weight:800; line-height:1.03;
  letter-spacing:-.02em; text-wrap:balance; animation:auf .55s ease-out .25s both;
}
.strich{
  width:80px; height:4px; background:${MARKE.akzent}; margin:3.4vh 0 3.2vh;
  animation:strich .5s ease-out .4s both;
}
ul{list-style:none; display:flex; flex-direction:column; gap:1.5vh}
li{
  font-size:clamp(16px,1.65vw,25px); font-weight:500; color:rgba(255,255,255,.92);
  padding-left:34px; position:relative; animation:auf .5s ease-out both;
}
li::before{
  content:""; position:absolute; left:0; top:.62em; width:18px; height:3px;
  background:${MARKE.akzent};
}
.fuss{
  display:flex; justify-content:space-between; align-items:flex-end; gap:24px;
  font-size:clamp(12px,1.1vw,15px); color:rgba(255,255,255,.62);
  border-top:1px solid ${MARKE.rahmenDunkel}; padding-top:2.2vh;
  animation:auf .5s ease-out .7s both;
}
@keyframes auf{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes strich{from{width:0;opacity:0}to{width:80px;opacity:1}}
${bewegung ? '' : '.kopf,.label,h1,.strich,li,.fuss{animation:none!important}'}
@media (prefers-reduced-motion:reduce){.kopf,.label,h1,.strich,li,.fuss{animation:none!important}}
</style></head><body>
<div class="kopf">${logo}</div>
<div class="mitte">
  <p class="label">${entschaerfen(label)}</p>
  <h1>${entschaerfen(titel)}</h1>
  <div class="strich"></div>
  <ul>${liste}</ul>
</div>
<div class="fuss"><span>${entschaerfen(fuss ?? '')}</span><span>${art === 'intro' ? 'Stars Media IT GmbH' : 'Fragen an Stars Media IT GmbH'}</span></div>
</body></html>`
}

/** Zeigt die Karte in der laufenden Aufnahme und wartet, bis die Schrift steht. */
export async function karteZeigen(page, karte) {
  await page.setContent(karteHtml(karte), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
}
