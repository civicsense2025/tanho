/**
 * Minimal, dependency-free RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes
 * (""), and embedded commas/newlines. Sufficient for the subscriber exports we ingest
 * (Substack/Mailchimp/Ghost/Buttondown/Kit/beehiiv), none of which need a heavyweight parser.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalize newlines.
  const s = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
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
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Flush the trailing field/row (files often lack a final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty trailing rows.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
