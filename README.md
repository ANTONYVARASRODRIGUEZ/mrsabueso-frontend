# MR. SABUESO · Veterinaria y Spa — Frontend (Angular 19)

Sitio web con reserva de citas en línea y **panel de administración** para la clínica.
Es solo frontend: los datos se guardan en el navegador (localStorage) y se pueden reemplazar por un backend.

## Requisitos
- Node.js 18.19+ (recomendado 20 o 22) y npm
- Visual Studio Code (extensión recomendada: *Angular Language Service*)

## Ejecutar
```bash
npm install
npm start          # http://localhost:4200
```
Otros: `npm run build` (producción → `dist/`), `npm test` (pruebas, requiere Chrome), `npm run test:ci` (headless).

## Cuentas de prueba
| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | `anali.rojas@gmail.com` | `Demo1234` |
| Administrador | `admin@mrsabueso.pe` | `Admin1234` |

También puedes registrarte en `/registro`. Los datos de demostración se generan al primer arranque
(clientes, mascotas, citas, reseñas, vacunas, mensajes) y se pueden restablecer en Panel → Configuración.

## Sitio público
| Ruta | Descripción |
|---|---|
| `/` | Inicio (servicios, cómo funciona, reseñas reales, preguntas frecuentes) |
| `/servicios` | Servicios con detalle (lee el catálogo administrable) |
| `/nosotros`, `/contacto` | Información, horarios, dirección, formulario (llega al panel) |
| `/reservar` | Reserva en 3 pasos *(requiere sesión)* |
| `/iniciar-sesion`, `/registro` | Autenticación |
| `/recuperar-contrasena`, `/restablecer` | Recuperar contraseña (enlace con vencimiento de 30 min) |

Modal **Mi cuenta**: mascotas, **carnet de vacunación e historial clínico** (solo lectura),
historial de citas, **reprogramar**, **cancelar** y **calificar** citas atendidas.

## Panel de administración (`/admin`, solo rol administrador)
- **Resumen:** KPIs (citas de hoy, ingresos, clientes, asistencia, calificación), gráficos, agenda de hoy con acciones rápidas, vacunas por vencer, mensajes y reseñas recientes.
- **Citas:** búsqueda y filtros (estado, servicio, fechas), paginación, cambio de estado y pago, reprogramar, detalle con notas, crear cita a nombre de un cliente, exportar CSV.
- **Agenda:** vista semanal con días cerrados sombreados.
- **Clientes:** ficha con mascotas y citas, bloquear/desbloquear, WhatsApp, exportar CSV.
- **Mascotas:** listado con estado de vacunas; **ficha** con historial clínico, carnet de vacunación (alta/edición/baja), citas, edición e impresión.
- **Recordatorios:** citas de hoy/mañana/próximos días y vacunas por vencer, con botón de WhatsApp y mensaje ya redactado (plantillas editables en Configuración). Marca lo ya enviado. *Es semiautomático: el envío automático real requiere backend.*
- **Reportes:** resumen mensual (ingresos, asistencia, por cobrar, clientes nuevos, comparación con el mes anterior), ingresos por servicio y clientes que no regresan con botón para reactivarlos; exporta CSV e imprime.
- **Importar clientes (en Clientes):** carga masiva desde CSV (Excel → Guardar como CSV) con vista previa, detección de duplicados y consentimiento; crea también las mascotas.
- **Servicios:** crear, editar, ocultar o eliminar (precio, duración, reserva en línea).
- **Reseñas:** distribución de calificaciones, ocultar, responder, eliminar.
- **Mensajes:** bandeja con estados y respuesta por WhatsApp.
- **Configuración:** datos del negocio, **dirección y horarios de atención reales**, horarios de cita, feriados/días cerrados, copia de seguridad JSON.

> ⚠️ Los **horarios (lun–sáb 9:00–19:00)** y la **dirección (vacía)** son provisionales. Edítalos en Panel → Configuración.
> El pago en línea no está incluido: el cobro se registra manualmente en el panel (pagado/pendiente).

## Arquitectura
```
src/app
├─ core/       models, config (negocio, catálogo, demo), data (LocalDb + semilla), state (stores con signals),
│              services (auth, toasts, confirmación), guards, utils (fechas, agenda, CSV), validators
├─ shared/ui/  iconos, foto con respaldo, logo, modal accesible, toasts, estrellas, selector de horarios, confirmación
├─ layout/     header y footer del sitio público
└─ features/   home, services, about, booking, contact, auth, account, admin, not-found
```
Componentes standalone con lazy loading, `OnPush`, signals, formularios reactivos tipados, guards (`authGuard`, `guestGuard`, `adminGuard`),
accesibilidad (foco atrapado en modales, `aria-*`, saltar al contenido) y 33 pruebas unitarias.

## Conectar el backend
Toda la UI depende solo de los *stores* de `core/state`, y estos de `LocalDb` (`core/data/local-db.service.ts`).
1. Reemplaza las lecturas/escrituras de cada store por `HttpClient` (`provideHttpClient()` + interceptor de token).
2. Sustituye `AuthService` por login, registro y recuperación reales (token o cookie httpOnly, envío de correo).
3. Elimina `LocalDb`, `seed.ts` y `config/demo.ts`; pon la URL en `src/environments/environment*.ts`.
4. Valida en el servidor: horarios disponibles, propiedad de las citas y rol de administrador.

> ⚠️ La autenticación actual es **simulada** (solo desarrollo). Cualquiera con acceso al navegador puede leer sus datos. No usar en producción.

## Personalizar
- Colores y tipografías: `src/styles/_tokens.scss`
- Servicios iniciales: `src/app/core/config/services.catalog.ts` (o desde el panel)
- Fotos: ver `docs/IMAGES.md`
