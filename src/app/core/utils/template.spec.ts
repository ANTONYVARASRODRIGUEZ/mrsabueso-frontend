import { renderTemplate } from './template';

describe('renderTemplate', () => {
  it('reemplaza las variables conocidas', () => {
    expect(renderTemplate('Hola {cliente}, {mascota}', { cliente: 'Ana', mascota: 'Boby' })).toBe('Hola Ana, Boby');
  });
  it('deja intactas las variables desconocidas', () => {
    expect(renderTemplate('Hola {otra}', { cliente: 'Ana' })).toBe('Hola {otra}');
  });
});
