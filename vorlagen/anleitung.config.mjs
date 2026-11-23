/**
 * Was diese Anleitungsstrecke ueber ihr Projekt wissen muss.
 * Alles andere steht im Drehbuch der einzelnen Anleitung.
 */
export default {
  // Name der Plattform, erscheint auf den Rahmenkarten und in der Uebersicht.
  plattform: 'Meine Plattform',

  // Wo die Anwendung im Probelauf laeuft. Muss stehen, bevor gebaut wird.
  basisUrl: 'http://localhost:3000',

  // Fusszeile der Rahmenkarten, z.B. die Adresse der Doku.
  adresse: 'docs.meine-plattform.de',

  // Zielgruppen in der Reihenfolge, in der sie meist vorkommen.
  zielgruppen: ['Gäste', 'Team'],

  // Stimme: 'piper' spricht offline vom eigenen Rechner,
  // 'voicestudio' spricht ueber die laufende VoiceStudio-Anwendung.
  stimme: { motor: 'piper', name: 'thorsten-high', port: 3901 },
}
