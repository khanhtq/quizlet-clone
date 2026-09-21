export type BulkSeparator = '\t' | ' - ' | ';' | ',' | 'auto';

export interface ParsedBulkItem {
  term: string;
  definition: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
}

/**
 * Automatically detect the most likely separator from input lines.
 */
export function detectSeparator(lines: string[]): '\t' | ' - ' | ';' | ',' {
  let tabs = 0;
  let dashes = 0;
  let semicolons = 0;
  let commas = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('\t')) tabs++;
    if (trimmed.includes(' - ')) dashes++;
    if (trimmed.includes(';')) semicolons++;
    if (trimmed.includes(',')) commas++;
  }

  // Priority order if equal
  if (tabs >= dashes && tabs >= semicolons && tabs >= commas && tabs > 0) return '\t';
  if (dashes >= semicolons && dashes >= commas && dashes > 0) return ' - ';
  if (semicolons >= commas && semicolons > 0) return ';';
  if (commas > 0) return ',';

  return '\t';
}

/**
 * Parse bulk text where each line is either "word" or "word <sep> meaning".
 * Supported separators: tab (\t), ' - ', ';', ',' or 'auto'.
 */
export function parseBulkText(
  rawText: string,
  separator: BulkSeparator = 'auto'
): ParsedBulkItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const rawLines = rawText.split(/\r?\n/);
  const effectiveSep =
    separator === 'auto' ? detectSeparator(rawLines) : separator;

  const results: ParsedBulkItem[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    let term = '';
    let definition = '';

    const sepIndex = line.indexOf(effectiveSep);
    if (sepIndex !== -1) {
      term = line.slice(0, sepIndex).trim();
      definition = line.slice(sepIndex + effectiveSep.length).trim();
    } else {
      term = line;
      definition = '';
    }

    // Strip surrounding quotes if present
    if (term.startsWith('"') && term.endsWith('"') && term.length >= 2) {
      term = term.slice(1, -1).trim();
    }
    if (definition.startsWith('"') && definition.endsWith('"') && definition.length >= 2) {
      definition = definition.slice(1, -1).trim();
    }

    if (term) {
      results.push({
        term,
        definition,
      });
    }
  }

  return results;
}

/**
 * RFC 4180 compliant CSV parser that handles quoted strings, escaped quotes (""),
 * embedded commas, and multiline values.
 */
export function parseCSV(csvText: string): ParsedBulkItem[] {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  // Check if first row is a header row (e.g. term, definition...)
  let startIndex = 0;
  const header = rows[0].map((h) => h.toLowerCase());
  let termIdx = 0;
  let defIdx = 1;
  let phoneticIdx = -1;
  let posIdx = -1;
  let exampleIdx = -1;

  if (header.includes('term') || header.includes('thuật ngữ') || header.includes('word')) {
    startIndex = 1;
    termIdx = header.findIndex((h) => h === 'term' || h === 'thuật ngữ' || h === 'word');
    defIdx = header.findIndex(
      (h) => h === 'definition' || h === 'định nghĩa' || h === 'meaning' || h === 'nghĩa'
    );
    phoneticIdx = header.findIndex((h) => h === 'phonetic' || h === 'phiên âm');
    posIdx = header.findIndex(
      (h) => h === 'part_of_speech' || h === 'partofspeech' || h === 'pos' || h === 'từ loại'
    );
    exampleIdx = header.findIndex((h) => h === 'example' || h === 'ví dụ');

    if (termIdx === -1) termIdx = 0;
    if (defIdx === -1) defIdx = 1;
  }

  const items: ParsedBulkItem[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const term = row[termIdx] || '';
    const definition = defIdx !== -1 && row[defIdx] ? row[defIdx] : '';

    if (!term) continue;

    items.push({
      term,
      definition,
      phonetic: phoneticIdx !== -1 && row[phoneticIdx] ? row[phoneticIdx] : undefined,
      partOfSpeech: posIdx !== -1 && row[posIdx] ? row[posIdx] : undefined,
      example: exampleIdx !== -1 && row[exampleIdx] ? row[exampleIdx] : undefined,
    });
  }

  return items;
}

/**
 * Format string as safe CSV field (escaped with quotes if contains commas, quotes, or newlines).
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export cards to RFC 4180 CSV with UTF-8 BOM for Excel compatibility.
 */
export function exportToCSV(
  cards: {
    term: string;
    definition: string;
    phonetic?: string | null;
    partOfSpeech?: string | null;
    example?: string | null;
  }[]
): string {
  const header = ['term', 'definition', 'phonetic', 'part_of_speech', 'example'];
  const lines: string[] = [header.join(',')];

  for (const card of cards) {
    const row = [
      escapeCSVField(card.term),
      escapeCSVField(card.definition),
      escapeCSVField(card.phonetic),
      escapeCSVField(card.partOfSpeech),
      escapeCSVField(card.example),
    ];
    lines.push(row.join(','));
  }

  // Prepend UTF-8 BOM so Excel opens Vietnamese characters cleanly
  return '\uFEFF' + lines.join('\r\n');
}
