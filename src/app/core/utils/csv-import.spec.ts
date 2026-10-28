import { buildImportRows, parseCsv } from './csv-import';

describe('parseCsv', () => {
  it('lee comillas, comas internas y saltos de línea de Windows', () => {
    expect(parseCsv('a,b\r\n"x, y","z ""q"""\r\n')).toEqual([['a', 'b'], ['x, y', 'z "q"']]);
  });
  it('detecta punto y coma y quita el BOM', () => {
    expect(parseCsv('\ufeffnombre;telefono\nAna;999')).toEqual([['nombre', 'telefono'], ['Ana', '999']]);
  });
});

describe('buildImportRows', () => {
  const none = new Set<string>();
  it('pide las columnas obligatorias', () => {
    expect(buildImportRows([['correo'], ['a@b.com']], none, none).missingColumns).toEqual(['nombre', 'telefono']);
  });
  it('valida filas y detecta duplicados dentro y fuera del archivo', () => {
    const table = [
      ['Nombre', 'Teléfono', 'Correo', 'Mascota', 'Especie'],
      ['Ana Prueba', '+51 900 000 001', 'ana@test.com', 'Rocky', 'Perro'],
      ['Ana Repetida', '51 900-000 001', '', '', ''],
      ['Lu', '900000002', '', '', ''],
      ['Luis Correcto', '900 000 003', 'mal-correo', '', ''],
      ['Marta Existente', '900000004', '', 'Michi', 'gato'],
    ];
    const { rows } = buildImportRows(table, new Set(['900000004']), none);
    expect(rows.map((r) => r.status)).toEqual(['ok', 'duplicate', 'error', 'error', 'duplicate']);
    expect(rows[0].species).toBe('dog');
  });
});
