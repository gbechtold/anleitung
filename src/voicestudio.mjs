/**
 * VoiceStudio from the outside: list, design, sample.
 *
 * Two things are worth knowing before using this. The application answers
 * OpenAI's own speech route on port 3900 with `response_format: 'pcm'` at
 * 24 kHz, which is exactly what argo reads, so nothing needs translating in
 * between. And the designer only understands English attribute words
 * (female, young adult, moderate pitch); a German description comes back
 * unmatched, with every attribute on 'Auto'. The spoken language is a
 * separate field and stays German.
 */
const VS = process.env.VOICESTUDIO_URL ?? 'http://127.0.0.1:3900'

async function holen(weg, optionen) {
  const antwort = await fetch(`${VS}${weg}`, optionen)
  if (!antwort.ok) {
    throw new Error(`VoiceStudio ${antwort.status} auf ${weg}: ${(await antwort.text()).slice(0, 300)}`)
  }
  return antwort
}

export async function zustand() {
  return (await holen('/health')).json()
}

export async function profile() {
  const d = await (await holen('/profiles')).json()
  return Array.isArray(d) ? d : (d.profiles ?? [])
}

export async function beschreiben(beschreibung) {
  return (
    await holen('/design/describe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: beschreibung }),
    })
  ).json()
}

/**
 * Legt ein Entwurfsprofil an. Die Beschreibung muss englische Merkmalswoerter
 * tragen, sonst bleibt jedes Merkmal auf 'Auto' und das Ergebnis ist Zufall.
 */
export async function profilEntwerfen({ name, beschreibung, sprache = 'de', seed }) {
  const gelesen = await beschreiben(beschreibung)
  const offen = gelesen.unmatched ?? []
  if (!gelesen.instruct) {
    throw new Error(
      `Aus "${beschreibung}" wurde kein Merkmal gelesen. VoiceStudio kennt nur englische Merkmalswoerter.`,
    )
  }

  const formular = new FormData()
  formular.set('name', name)
  formular.set('kind', 'design')
  formular.set('instruct', gelesen.instruct)
  formular.set('language', sprache)
  formular.set('vd_states', JSON.stringify(gelesen.attrs))
  if (seed != null) formular.set('seed', String(seed))

  const profil = await (await holen('/profiles', { method: 'POST', body: formular })).json()
  return { profil, instruct: gelesen.instruct, ungelesen: offen }
}

/** Rohes PCM, 24 kHz, 16 bit, mono: die Form, die argo liest. */
export async function sprechen({ text, stimme, modell = 'omnivoice', sprache = 'de', tempo = 1 }) {
  const antwort = await holen('/v1/audio/speech', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modell,
      input: text,
      voice: stimme,
      language: sprache,
      speed: tempo,
      response_format: 'pcm',
    }),
  })
  return Buffer.from(await antwort.arrayBuffer())
}
