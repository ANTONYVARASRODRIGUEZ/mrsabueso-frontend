import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

const TITLE = 'MR. SABUESO';

export const routes: Routes = [
  { path: '', pathMatch: 'full', title: `${TITLE} · Veterinaria y Spa`, loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'servicios', title: `Servicios · ${TITLE}`, loadComponent: () => import('./features/services/services.page').then((m) => m.ServicesPage) },
  { path: 'nosotros', title: `Nosotros · ${TITLE}`, loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage) },
  { path: 'reservar', canActivate: [authGuard], title: `Reservar cita · ${TITLE}`, loadComponent: () => import('./features/booking/booking.page').then((m) => m.BookingPage) },
  { path: 'contacto', title: `Contacto · ${TITLE}`, loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage) },
  { path: 'iniciar-sesion', canActivate: [guestGuard], title: `Iniciar sesión · ${TITLE}`, loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage) },
  { path: 'registro', canActivate: [guestGuard], title: `Crear cuenta · ${TITLE}`, loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage) },
  { path: 'recuperar-contrasena', canActivate: [guestGuard], title: `Recuperar contraseña · ${TITLE}`, loadComponent: () => import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPage) },
  { path: 'restablecer', canActivate: [guestGuard], title: `Nueva contraseña · ${TITLE}`, loadComponent: () => import('./features/auth/reset-password.page').then((m) => m.ResetPasswordPage) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', title: `Panel · ${TITLE}`, loadComponent: () => import('./features/admin/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'citas', title: `Citas · Panel`, loadComponent: () => import('./features/admin/appointments.page').then((m) => m.AdminAppointmentsPage) },
      { path: 'agenda', title: `Agenda · Panel`, loadComponent: () => import('./features/admin/agenda.page').then((m) => m.AgendaPage) },
      { path: 'clientes', title: `Clientes · Panel`, loadComponent: () => import('./features/admin/customers.page').then((m) => m.CustomersPage) },
      { path: 'mascotas', title: `Mascotas · Panel`, loadComponent: () => import('./features/admin/pets.page').then((m) => m.AdminPetsPage) },
      { path: 'mascotas/:id', title: `Ficha de mascota · Panel`, loadComponent: () => import('./features/admin/pet-record.page').then((m) => m.PetRecordPage) },
      { path: 'recordatorios', title: `Recordatorios · Panel`, loadComponent: () => import('./features/admin/reminders.page').then((m) => m.RemindersPage) },
      { path: 'reportes', title: `Reportes · Panel`, loadComponent: () => import('./features/admin/reports.page').then((m) => m.ReportsPage) },
      { path: 'servicios', title: `Servicios · Panel`, loadComponent: () => import('./features/admin/services.page').then((m) => m.AdminServicesPage) },
      { path: 'resenas', title: `Reseñas · Panel`, loadComponent: () => import('./features/admin/reviews.page').then((m) => m.AdminReviewsPage) },
      { path: 'mensajes', title: `Mensajes · Panel`, loadComponent: () => import('./features/admin/messages.page').then((m) => m.MessagesPage) },
      { path: 'administradores', title: `Administradores · Panel`, loadComponent: () => import('./features/admin/admins.page').then((m) => m.AdminsPage) },
      { path: 'configuracion', title: `Configuración · Panel`, loadComponent: () => import('./features/admin/settings.page').then((m) => m.SettingsPage) },
    ],
  },
  // Compatibilidad con las rutas del prototipo
  { path: 'nosotras', redirectTo: 'nosotros' },
  { path: 'horarios', redirectTo: 'reservar' },
  { path: '**', title: `Página no encontrada · ${TITLE}`, loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage) },
];
