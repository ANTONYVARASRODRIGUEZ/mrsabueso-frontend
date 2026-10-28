import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Exige sesión; si no hay, envía al login recordando a dónde volver. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
};

/** Para login/registro/recuperación: si ya hay sesión, redirige. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !auth.isLoggedIn() || router.createUrlTree([auth.isAdmin() ? '/admin' : '/']);
};

/** Solo administradores. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
  return auth.isAdmin() || router.createUrlTree(['/']);
};
