export type ImportStatus = 'ok' | 'duplicate' | 'error';

export interface ImportRow {
  line: number;
  fullName: string;
  phone: string;
  email: string;
  petName: string;
  species: 'dog' | 'cat' | 'other';
  breed: string;
  status: ImportStatus;
  message: string;
}

export const IMPORT_TEMPLATE = 'nombre,telefono,correo,mascota,especie,raza\nMaría Pérez,+51 999 111 222,maria@correo.com,Rocky,perro,Labrador\nJuan Díaz,+51 988 777 666,,Michi,gato,Siamés\n';

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const digits = (v: string): string => v.replace(/\D/g, '');
const norm = (v: string): string => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Lee un CSV (separador coma o punto y coma, comillas, saltos de línea de Windows y BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\ufeff/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const HEADERS: Record<string, string[]> = {
  fullName: ['nombre', 'nombre completo', 'cliente', 'nombres'],
  phone: ['telefono', 'celular', 'whatsapp', 'telefono/whatsapp', 'movil'],
  email: ['correo', 'email', 'e-mail', 'correo electronico'],
  petName: ['mascota', 'nombre mascota', 'nombre de la mascota'],
  species: ['especie', 'tipo', 'tipo de mascota'],
  breed: ['raza'],
};

const speciesOf = (v: string): ImportRow['species'] => {
  const s = norm(v);
  if (['perro', 'perra', 'canino', 'dog'].includes(s)) return 'dog';
  if (['gato', 'gata', 'felino', 'cat'].includes(s)) return 'cat';
  return s === '' ? 'dog' : 'other';
};

/** Convierte la tabla en filas validadas contra el archivo mismo y contra lo ya registrado. */
export function buildImportRows(table: string[][], existingPhones: Set<string>, existingEmails: Set<string>): { rows: ImportRow[]; missingColumns: string[] } {
  if (table.length === 0) return { rows: [], missingColumns: ['nombre', 'telefono'] };
  const header = table[0].map(norm);
  const idx = (key: string): number => header.findIndex((h) => HEADERS[key].includes(h));
  const col = { fullName: idx('fullName'), phone: idx('phone'), email: idx('email'), petName: idx('petName'), species: idx('species'), breed: idx('breed') };
  const missingColumns = [col.fullName < 0 ? 'nombre' : '', col.phone < 0 ? 'telefono' : ''].filter(Boolean);
  if (missingColumns.length) return { rows: [], missingColumns };

  const seenPhones = new Set<string>(); const seenEmails = new Set<string>();
  const get = (r: string[], i: number): string => (i >= 0 ? (r[i] ?? '').trim() : '');
  const rows = table.slice(1).map((r, n): ImportRow => {
    const row: ImportRow = {
      line: n + 2, fullName: get(r, col.fullName), phone: get(r, col.phone), email: get(r, col.email).toLowerCase(),
      petName: get(r, col.petName), species: speciesOf(get(r, col.species)), breed: get(r, col.breed), status: 'ok', message: '',
    };
    const d = digits(row.phone);
    if (row.fullName.length < 3) { row.status = 'error'; row.message = 'Nombre muy corto'; }
    else if (!PHONE_RE.test(row.phone)) { row.status = 'error'; row.message = 'Teléfono no válido'; }
    else if (row.email && !EMAIL_RE.test(row.email)) { row.status = 'error'; row.message = 'Correo no válido'; }
    else if (existingPhones.has(d) || seenPhones.has(d)) { row.status = 'duplicate'; row.message = 'Teléfono ya registrado'; }
    else if (row.email && (existingEmails.has(row.email) || seenEmails.has(row.email))) { row.status = 'duplicate'; row.message = 'Correo ya registrado'; }
    if (row.status === 'ok') { seenPhones.add(d); if (row.email) seenEmails.add(row.email); }
    return row;
  });
  return { rows, missingColumns: [] };
}
