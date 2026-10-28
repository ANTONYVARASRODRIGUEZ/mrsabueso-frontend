# Guía de imágenes

El sitio muestra un recuadro elegante de respaldo mientras una foto no exista. Para que se vea
profesional, coloca **fotos reales (JPG, 80–85 % de calidad)** con estos nombres exactos dentro de `public/images/`:

| Archivo | Dónde se usa | Tamaño recomendado | Qué mostrar |
|---|---|---|---|
| `hero/hero.jpg` | Inicio (portada) | 1000 × 1200 px (vertical) | Perro o gato feliz, bien iluminado |
| `about/team.jpg` | Nosotros | 1000 × 1000 px (se recorta en círculo) | Veterinaria con una mascota |
| `services/grooming.jpg` | Servicios | 800 × 800 px | Baño y corte |
| `services/consulta.jpg` | Servicios | 800 × 800 px | Consulta / tratamiento |
| `services/vacunacion.jpg` | Servicios | 800 × 800 px | Vacunación |
| `services/dental.jpg` | Servicios | 800 × 800 px | Profilaxis dental |
| `services/petshop.jpg` | Servicios | 800 × 800 px | Productos del pet shop |
| `auth/login.jpg` | Panel de Iniciar sesión | 1200 × 1400 px | Mascota (se ve tenue al fondo) |
| `auth/register.jpg` | Panel de Registro | 1200 × 1400 px | Mascota (se ve tenue al fondo) |

## Consejos
- Usa **fotos propias de tu local y clientes** (con permiso) o bancos gratuitos como Unsplash / Pexels (revisa su licencia).
- Comprime con squoosh.app o tinypng.com: ideal < 200 KB por imagen.
- Para cambiar un nombre o ruta, edita `src/app/core/config/services.catalog.ts` (servicios) o la plantilla de la página correspondiente.
