import { BusinessSettings } from '../models';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
/** Orden de visualización: de lunes a domingo. */
export const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * Valores iniciales del negocio. El administrador puede cambiarlos en
 * Panel → Configuración (horarios, dirección, teléfonos, feriados, etc.).
 * Los horarios y la dirección son PROVISIONALES: confírmalos con los datos reales.
 */
export const DEFAULT_SETTINGS: BusinessSettings = {
  name: 'MR. SABUESO',
  tagline: 'Veterinaria y Spa',
  phone: '+51 923 399 129',
  whatsapp: '51923399129',
  email: '',
  address: '',
  mapsUrl: '',
  facebook: '@mrsabuesoveterinaria',
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: day !== 0, from: '09:00', to: '19:00' })),
  slots: ['09:30', '11:00', '14:30', '16:00', '17:30', '18:30'],
  closedDates: [],
  apptReminderTemplate: 'Hola {cliente}, te recordamos la cita de {mascota} en {negocio}: {servicio}, {fecha} a las {hora}. Si no puedes asistir, avísanos para reprogramar. ¡Te esperamos!',
  vaccineReminderTemplate: 'Hola {cliente}, la vacuna {vacuna} de {mascota} {estado} {fecha}. Puedes reservar su cita en línea o escribirnos por aquí. — {negocio}',
};

export const whatsappUrl = (number: string, text?: string): string =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
