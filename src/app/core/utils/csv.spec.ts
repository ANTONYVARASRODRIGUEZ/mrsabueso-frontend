import { toCsv } from './csv';

describe('toCsv', () => {
  it('escapa comillas, comas y saltos de línea', () => {
    expect(toCsv([['a', 'b,c', 'd"e', 'f\ng']])).toBe('a,"b,c","d""e","f\ng"');
  });
  it('trata undefined y null como celdas vacías', () => {
    expect(toCsv([[1, undefined, null, 'x']])).toBe('1,,,x');
  });
});
