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

  // Stimme. 'piper' spricht offline vom eigenen Rechner und braucht die
  // Bruecke aus "anleitung stimme" auf Port 3901. 'voicestudio' spricht
  // direkt mit der laufenden Anwendung auf Port 3900, ohne Bruecke; 'name'
  // ist dort der Profilname oder die Profil-ID.
  stimme: { motor: 'piper', name: 'kerstin-medium', port: 3901 },
}
