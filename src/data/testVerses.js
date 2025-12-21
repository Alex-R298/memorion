export const categories = [
  { id: 'trost', name: 'Trost', emoji: '🤗' },
  { id: 'liebe', name: 'Liebe', emoji: '❤️' },
  { id: 'hoffnung', name: 'Hoffnung', emoji: '🌟' },
  { id: 'mut', name: 'Mut', emoji: '💪' },
]

export const versesByCategory = {
  trost: [
    {
      id: 1,
      reference: "Matthäus 11:28",
      text: "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.",
      hiddenWordIndex: 11, // "erquicken"
    },
    {
      id: 2,
      reference: "Psalm 23:4",
      text: "Und ob ich schon wanderte im finsteren Tal, fürchte ich kein Unglück, denn du bist bei mir.",
      hiddenWordIndex: 13, // "mir"
    },
    {
      id: 3,
      reference: "2. Korinther 1:3-4",
      text: "Gelobt sei Gott, der Vater unseres Herrn Jesus Christus, der Vater der Barmherzigkeit und Gott allen Trostes.",
      hiddenWordIndex: 17, // "Trostes"
    },
  ],
  liebe: [
    {
      id: 4,
      reference: "Johannes 3:16",
      text: "Denn so hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab.",
      hiddenWordIndex: 5, // "geliebt"
    },
    {
      id: 5,
      reference: "1. Johannes 4:16",
      text: "Gott ist Liebe, und wer in der Liebe bleibt, der bleibt in Gott und Gott in ihm.",
      hiddenWordIndex: 2, // "Liebe"
    },
    {
      id: 6,
      reference: "1. Korinther 13:4",
      text: "Die Liebe ist langmütig und freundlich, die Liebe eifert nicht.",
      hiddenWordIndex: 5, // "freundlich"
    },
  ],
  hoffnung: [
    {
      id: 7,
      reference: "Jeremia 29:11",
      text: "Denn ich weiß wohl, welche Gedanken ich über euch habe, spricht der HERR: Gedanken des Friedens und nicht des Leides.",
      hiddenWordIndex: 16, // "Friedens"
    },
    {
      id: 8,
      reference: "Römer 15:13",
      text: "Der Gott der Hoffnung aber erfülle euch mit aller Freude und Frieden im Glauben.",
      hiddenWordIndex: 3, // "Hoffnung"
    },
  ],
  mut: [
    {
      id: 9,
      reference: "Josua 1:9",
      text: "Siehe, ich habe dir geboten, dass du getrost und unverzagt seist.",
      hiddenWordIndex: 9, // "getrost"
    },
    {
      id: 10,
      reference: "Philipper 4:13",
      text: "Ich vermag alles durch den, der mich stark macht, Christus.",
      hiddenWordIndex: 9, // "stark"
    },
  ],
}