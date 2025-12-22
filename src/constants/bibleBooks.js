// constants/bibleBooks.js

export const BOOK_NAMES = [
  // Altes Testament
  '1.Mose', '2.Mose', '3.Mose', '4.Mose', '5.Mose',
  'Josua', 'Richter', 'Ruth',
  '1.Samuel', '2.Samuel',
  '1.Könige', '2.Könige',
  'Psalmen', 'Sprüche', 'Prediger',
  'Jesaja', 'Jeremia', 'Hesekiel', 'Daniel',
  
  // Neues Testament
  'Matthäus', 'Markus', 'Lukas', 'Johannes',
  'Apostelgeschichte',
  'Römer', '1.Korinther', '2.Korinther',
  'Galater', 'Epheser', 'Philipper', 'Kolosser',
  '1.Thessalonicher', '2.Thessalonicher',
  '1.Timotheus', '2.Timotheus',
  'Titus', 'Philemon',
  'Hebräer', 'Jakobus',
  '1.Petrus', '2.Petrus',
  '1.Johannes', '2.Johannes', '3.Johannes',
  'Judas', 'Offenbarung'
];

// Für die API müssen Umlaute und Punkte weg
export function normalizeBookName(book) {
  return book
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/\./g, '');
}

// Beispiele für API-Format
export const BOOK_EXAMPLES = {
  '1.Mose': '1mose',
  'Matthäus': 'matthaeus',
  'Römer': 'roemer',
  'Johannes': 'johannes',
  '1.Korinther': '1korinther'
};