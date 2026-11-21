export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n")
    .concat("\r\n");
}
