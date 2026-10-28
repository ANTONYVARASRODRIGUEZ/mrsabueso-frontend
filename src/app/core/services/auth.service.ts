import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE, ApiDb, ApiError, TOKEN_KEY, USER_KEY } from '../data/api-db.service';
import { User } from '../models';
import { readJson, removeKey, writeJson } from '../utils/storage';

export type AuthErrorCode = 'invalid-credentials' | 'email-taken' | 'disabled' | 'invalid-token' | 'unknown';
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) { super(code); }
}

export interface RegisterInput { fullName: string; email: string; phone?: string; password: string; }

interface Session { token: string; user: User; }

const toAuthError = (e: unknown): AuthError =>
  new AuthError(e instanceof ApiError && e.code ? (e.code as AuthErrorCode) : 'unknown');

/** Agrega el token a las llamadas a la API y cierra la sesión si el servidor lo rechaza. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector); // AuthService se obtiene después: él mismo hace peticiones al construirse
  const token = readJson<string | null>(TOKEN_KEY, null);
  const toApi = req.url.startsWith(API_BASE);
  return next(token && toApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req).pipe(
    catchError((e) => {
      if (toApi && token && e.status === 401) injector.get(AuthService).logout();
      return throwError(() => e);
    }),
  );
};

/**
 * Sesión con el backend (JWT). El usuario se guarda también en localStorage para que
 * los guards funcionen al recargar; luego se confirma con GET /auth/me.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(ApiDb);

  readonly user = signal<User | null>(readJson<string | null>(TOKEN_KEY, null) ? readJson<User | null>(USER_KEY, null) : null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly displayName = computed(() => {
    const parts = this.user()?.fullName.trim().split(/\s+/) ?? [];
    return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : (parts[0] ?? '');
  });

  constructor() {
    this.db.load(this.user()?.role ?? null);
    if (this.user()) this.db.req<User>('GET', '/auth/me').subscribe({ next: (u) => this.setUser(u), error: () => undefined });
  }

  login(email: string, password: string): Observable<User> {
    return this.db.req<Session>('POST', '/auth/login', { email, password }).pipe(map((s) => this.start(s)), catchError((e) => throwError(() => toAuthError(e))));
  }

  register(input: RegisterInput): Observable<User> {
    return this.db.req<Session>('POST', '/auth/register', input).pipe(map((s) => this.start(s)), catchError((e) => throwError(() => toAuthError(e))));
  }

  /** Ingreso con la credencial (ID token) que entrega el botón de Google. */
  loginWithGoogle(credential: string): Observable<User> {
    return this.db.req<Session>('POST', '/auth/google', { credential }).pipe(map((s) => this.start(s)), catchError((e) => throwError(() => toAuthError(e))));
  }

  logout(): void {
    if (!this.user() && !readJson<string | null>(TOKEN_KEY, null)) return;
    removeKey(TOKEN_KEY); removeKey(USER_KEY);
    this.user.set(null);
    this.db.load(null);
  }

  /** Pide el enlace de recuperación. El backend solo devuelve el token en desarrollo (en producción va por correo). */
  requestPasswordReset(email: string): Observable<string | null> {
    return this.db.req<{ token: string | null }>('POST', '/auth/forgot-password', { email }).pipe(map((r) => r.token ?? null));
  }

  checkResetToken(token: string | undefined): Observable<boolean> {
    if (!token) return of(false);
    return this.db.req<{ valid: boolean }>('GET', `/auth/reset-token/${encodeURIComponent(token)}`).pipe(map((r) => r.valid), catchError(() => of(false)));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.db.req<void>('POST', '/auth/reset-password', { token, newPassword }).pipe(catchError(() => throwError(() => new AuthError('invalid-token'))));
  }

  private start(s: Session): User {
    writeJson(TOKEN_KEY, s.token);
    this.setUser(s.user);
    this.db.load(s.user.role);
    return s.user;
  }

  private setUser(u: User): void {
    writeJson(USER_KEY, u);
    this.user.set(u);
  }
}
