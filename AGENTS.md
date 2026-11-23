# AGENTS.md: anleitung (261123-Anleitungsstrecke)

## Goal

One reusable package that turns a feature of any web app into a narrated video
and a documentation page from a single source. Built on 23.11.2026 out of the
w3 tickets prototype, which is the first caller.

## Context

- The first caller lives in
  `/Users/guntrambechtold/Documents/Projects/BusinessProjects/091-W3-Marketing/src/anleitungen`.
  When something changes here, that project is the test.
- The market was checked on 23.11.2026 before writing code: the recorder
  exists (argo, 222 stars, MIT) and is used as a dependency. Tools that
  promise video and markdown from one source exist too, but all sit at zero to
  25 stars and are weeks old.
- House style for the cards: AGENTS.md section 14, three colours, Figtree, the
  80 x 4 rule, no shadows and no rounded corners. Font and logo are embedded in
  `assets/`, so a card renders the same offline.

## Rules that hold

- **Repo files are English** per house rule section 1. The German strings in
  templates and cards are product text, not documentation.
- **No fixed numbers from the application in a locator.** Match by role and
  label, or by pattern.
- **Every drehbuch gives back what it took.** Carts, holds, drafts: the last
  lines of the run release them.
- **The voice model's licence is checked before a client video is rendered.**
  OmniVoice is CC-BY-NC.

## Current tasks

- [ ] Publish to GitHub (decision by Guntram: account, public or private)
- [ ] Voice decision for w3 tickets after the samples in `stimmproben/`
- [ ] `anleitung pruefen`: a feature without a drehbuch, a drehbuch that no
      longer runs, a page without a video
- [ ] A second caller besides w3 tickets, to find what is still hard-wired
