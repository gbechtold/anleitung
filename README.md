# anleitung

Narrated walkthrough videos **and** documentation pages for a web app, both
generated from one source per feature. Change the sentence, run it again.
Nobody opens a video editor.

```
anleitungen/<slug>.demo.ts      the steps: what the browser does
anleitungen/<slug>.scenes.json  the sentences: what the voice says
anleitungen/anleitungen.json    the list: titles, audiences, card texts
         │
         ├─ argo  ─────────▶ videos/<slug>.mp4 + .srt + .vtt
         └─ anleitung doku ▶ doku/<slug>.md + doku/bilder/*.png + doku/index.md
```

Every video opens and closes on a title card carrying the goal, the key points
and the Stars Media logo. The pictures in the documentation are cut out of the
finished video at each scene's own timestamp, so page and video cannot drift
apart.

## What it is made of

| Part | Who does it |
|---|---|
| Driving the app, the visible cursor, aligning speech to the steps | [argo](https://github.com/shreyaskarnik/argo), MIT |
| The voice | Piper (offline, local) or VoiceStudio (local, cloning) |
| Title cards, documentation pages, overview, voice samples | this package |
| The readable site | MkDocs Material |

The recorder is not ours on purpose. argo brings the SVG cursor on seeded
curves, the narration timeline and the ffmpeg export; rebuilding that would
cost days and age badly.

## Install

```bash
npm i -D @starsmedia/anleitung @argo-video/cli @playwright/test openai
npx playwright install chromium
brew install ffmpeg          # ffmpeg and ffprobe must be on PATH
```

A voice, one of:

```bash
# offline, free, German, male and female
uv tool install piper-tts
# voices into ~/.local/share/piper-voices/ from rhasspy/piper-voices

# or VoiceStudio, for a cloned or designed voice (AGPL app, per-model licence)
brew install --cask debpalash/tap/voicestudio
```

## Use

```bash
anleitung init                              # config, templates, folders
anleitung neu 01-erster-weg "Titel"         # drehbuch + sentences + list entry
anleitung stimme                            # the speech endpoint, second window
anleitung bauen 01-erster-weg               # video, then documentation page
mkdocs serve                                # read the result
anleitung proben --stimmen=kerstin-medium,ramona   # compare voices
```

## Three traps, measured 23.11.2026

1. **`test.setTimeout()` belongs in the drehbuch.** argo writes its own
   Playwright config for the recording run and never reads
   `playwright.config.ts`, so the 30 second default applies and kills a
   narrated walkthrough mid-scene. The recording dies with it. The template
   carries the line.
2. **No fixed number in a locator.** `getByText('Noch 190 von 1.200
   verfügbar')` passed once and then hung forever, because two runs had sold
   two tickets in the meantime. Match with a pattern.
3. **The speech endpoint must answer raw PCM at 24 kHz.** argo asks for
   `response_format: 'pcm'` and assumes 24 kHz mono 16-bit. Piper writes
   22.05 kHz, VoiceStudio writes a WAV; `src/stimme.mjs` resamples both.
   Getting it wrong does not raise: the voice plays at the wrong pitch and
   drifts out of the timeline.

## Known rough edges

- argo 0.42 writes subtitle end times with fractional milliseconds
  (`00:00:09,137.0833…`), which no player accepts. `anleitung doku` repairs
  them on the way into `doku/videos/`.
- If the narration runs longer than the recording, argo pads the last frame.
  Shorten the sentence or lengthen the step.
- A run takes real state out of the app under test (a cart, a hold, a draft).
  Give it back at the end of the drehbuch, or a night of retries drains it.

## Licence

MIT for this package. The pieces it drives carry their own: argo MIT, Piper
MIT with per-voice licences, VoiceStudio AGPL-3.0 with per-model weights.
**The default VoiceStudio model, OmniVoice, is CC-BY-NC** and does not cover a
commercial product video. Pick the model deliberately.
