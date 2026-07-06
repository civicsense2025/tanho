/**
 * Shared CSV parsing for importers — lifted verbatim from ghost/parse.ts (the
 * RFC-4180-quoting-aware splitter + record joiner that handles embedded newlines
 * in quoted fields, which a naive line split would corrupt). Substack's subscriber
 * CSV and any future CSV importer reuse these instead of re-implementing quoting.
 */

/** Split one CSV line into fields, honoring RFC 4180 quoting (a quoted field may
 *  contain commas; embedded newlines are handled by `toCsvRecords` joining the
 *  record before this runs). */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

/** Join raw CSV text into logical records — a quoted field may contain a literal
 *  newline, which a naive line-by-line split would break mid-record. */
export function toCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === '"') inQuotes = !inQuotes;
    if (c === "\n" && !inQuotes) {
      if (current.length > 0) rows.push(splitCsvLine(current));
      current = "";
      continue;
    }
    current += c;
  }
  if (current.length > 0) rows.push(splitCsvLine(current));
  return rows;
}

/**
 * Parse CSV text into header-keyed row objects — tolerant of column reordering
 * (keys by header name, not position). Returns `[]` for an empty/headerless file.
 * Header names are trimmed; values are returned raw (caller trims/coerces).
 */
export function parseCsvRows(text: string): Array<Record<string, string>> {
  const records = toCsvRecords(text);
  if (records.length === 0) return [];
  const headers = records[0]!.map((h) => h.trim());
  return records.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}
