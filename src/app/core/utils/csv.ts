const escapeCell = (v: string | number | undefined | null): string => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: (string | number | undefined | null)[][]): string {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]): void {
  downloadFile(filename, '\ufeff' + toCsv(rows), 'text/csv;charset=utf-8');
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
