import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEFAULT_SETTINGS } from '../config/business';
import {
  Appointment, BusinessSettings, ContactMessage, MedicalEntry, Pet, Review, Role, Service, User, Vaccination,
} from '../models';
import { ToastService } from '../services/toast.service';

export const TOKEN_KEY = 'mrs2.token';
export const USER_KEY = 'mrs2.user';
export const API_BASE = `${environment.apiUrl}/api`;

/** Error de la API con el mensaje y el código que devuelve el backend ({ code, message }). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

const toApiError = (e: HttpErrorResponse): ApiError => {
  if (e.status === 0) return new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
  return new ApiError(e.error?.message ?? 'Ocurrió un error inesperado.', e.status, e.error?.code ?? undefined);
};

/**
 * Datos de la API en señales (una por colección). Los stores de `core/state` leen de aquí
 * y escriben con `req`, actualizando la señal con la respuesta del servidor.
 */
@Injectable({ providedIn: 'root' })
export class ApiDb {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly users = signal<User[]>([]);
  readonly pets = signal<Pet[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly medical = signal<MedicalEntry[]>([]);
  readonly vaccines = signal<Vaccination[]>([]);
  readonly messages = signal<ContactMessage[]>([]);
  readonly services = signal<Service[]>([]);
  readonly settings = signal<BusinessSettings>(DEFAULT_SETTINGS);

  req<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Observable<T> {
    return this.http.request<T>(method, API_BASE + path, { body }).pipe(catchError((e: HttpErrorResponse) => throwError(() => toApiError(e))));
  }

  /** Para acciones de "dispara y olvida" del panel: si falla, avisa con un toast. */
  fire<T>(obs: Observable<T>): void {
    obs.subscribe({ error: (e: Error) => this.toast.error(e.message) });
  }

  /** Carga lo público y, según el rol, lo propio del cliente o todo el panel. */
  load(role: Role | null): void {
    const get = <T>(path: string, fallback: T): Observable<T> => this.req<T>('GET', path).pipe(catchError(() => of(fallback)));
    forkJoin({
      services: get<Service[]>('/services', []),
      settings: get<BusinessSettings>('/settings', DEFAULT_SETTINGS),
      reviews: get<Review[]>('/reviews', []),
    }).subscribe((r) => { this.services.set(r.services); this.settings.set(r.settings); this.reviews.set(r.reviews); });

    if (!role) {
      this.users.set([]); this.pets.set([]); this.appointments.set([]);
      this.medical.set([]); this.vaccines.set([]); this.messages.set([]);
      return;
    }
    forkJoin({
      pets: get<Pet[]>('/pets', []),
      appointments: get<Appointment[]>('/appointments', []),
      medical: get<MedicalEntry[]>('/medical', []),
      vaccines: get<Vaccination[]>('/vaccines', []),
      users: role === 'admin' ? get<User[]>('/customers', []) : of([]),
      messages: role === 'admin' ? get<ContactMessage[]>('/messages', []) : of([]),
    }).subscribe((r) => {
      this.pets.set(r.pets); this.appointments.set(r.appointments); this.medical.set(r.medical);
      this.vaccines.set(r.vaccines); this.users.set(r.users); this.messages.set(r.messages);
    });
  }

  /** Copia de seguridad en JSON (sin contraseñas). */
  exportJson(): Observable<string> {
    return this.req<unknown>('GET', '/admin/export').pipe(map((d) => JSON.stringify(d, null, 2)));
  }
}

/** Reemplaza el elemento con el mismo id (o lo agrega al final). */
export const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
