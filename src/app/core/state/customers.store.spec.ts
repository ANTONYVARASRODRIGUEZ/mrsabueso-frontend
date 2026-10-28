import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiDb } from '../data/api-db.service';
import { User } from '../models';
import { CustomersStore } from './customers.store';

const client = (id: string, phone: string): User =>
  ({ id, fullName: 'Ana Prueba', email: '', phone, role: 'client', active: true, createdAt: '2026-01-01T00:00:00Z' });

describe('CustomersStore', () => {
  let store: CustomersStore;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(CustomersStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('exige el consentimiento de datos para crear un cliente (sin llamar a la API)', () => {
    let error = '';
    store.create({ fullName: 'Ana Prueba', phone: '+51 900 000 001', consent: false }).subscribe({ error: (e: Error) => (error = e.message) });
    expect(error).toMatch(/aceptó/);
    http.expectNone(() => true);
  });

  it('crea el cliente en la API y lo agrega a la lista', () => {
    store.create({ fullName: 'Ana Prueba', phone: '+51 900 000 001', consent: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/customers') && r.method === 'POST');
    req.flush(client('u-1', '+51 900 000 001'));
    expect(store.byId('u-1')).toBeTruthy();
  });

  it('detecta teléfonos repetidos ignorando espacios y símbolos', () => {
    TestBed.inject(ApiDb).users.set([client('u-1', '+51 900-000 001')]);
    expect(store.findByPhone('51900000001')?.id).toBe('u-1');
    expect(store.findByPhone('51900000001', 'u-1')).toBeUndefined();
    expect(store.findByPhone('123')).toBeUndefined();
  });
});
