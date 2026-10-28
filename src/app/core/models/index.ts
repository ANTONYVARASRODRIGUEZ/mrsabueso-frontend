export type PetSpecies = 'dog' | 'cat' | 'other';
export type PetSex = 'male' | 'female';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed: string;
  sex?: PetSex;
  /** yyyy-mm-dd */
  birthDate?: string;
  /** URL o data-URL. Si falta se muestra un avatar por defecto. */
  photoUrl?: string;
  notes?: string;
}
export type NewPet = Omit<Pet, 'id' | 'ownerId'>;

export type IconName =
  | 'paw' | 'scissors' | 'syringe' | 'tooth' | 'stethoscope' | 'bag' | 'phone' | 'whatsapp'
  | 'pin' | 'check' | 'clock' | 'calendar' | 'user' | 'menu' | 'x' | 'arrow-right' | 'heart'
  | 'shield' | 'star' | 'facebook' | 'chevron-down' | 'camera' | 'plus'
  | 'home' | 'list' | 'users' | 'message' | 'settings' | 'download' | 'edit' | 'trash'
  | 'search' | 'logout' | 'mail' | 'lock' | 'file' | 'alert' | 'chart' | 'refresh';

export interface Service {
  id: string;
  name: string;
  summary: string;
  description: string;
  includes: string[];
  icon: IconName;
  /** Precio base en soles. */
  priceFrom?: number;
  durationMin: number;
  bookable: boolean;
  active: boolean;
  /** Ruta de la foto (dentro de /public/images). */
  image: string;
}

export type Role = 'client' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  /** ISO datetime */
  createdAt: string;
  /** false = cuenta bloqueada por el administrador */
  active: boolean;
  /** Cuándo aceptó el tratamiento de sus datos personales y dónde (web o en el local, registrado por el administrador). */
  consentAt?: string;
  consentSource?: 'web' | 'admin';
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid';

export interface Appointment {
  id: string;
  code: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  petId: string;
  petName: string;
  serviceId: string;
  serviceName: string;
  price?: number;
  /** yyyy-mm-dd */
  date: string;
  /** HH:mm (24 h) */
  time: string;
  status: AppointmentStatus;
  payment: PaymentStatus;
  notes?: string;
  createdAt: string;
  rescheduleCount: number;
  /** Cuándo se envió el recordatorio por WhatsApp (marcado desde el panel). */
  reminderSentAt?: string;
}
export type NewAppointment = Pick<Appointment, 'petId' | 'serviceId' | 'date' | 'time'> & { notes?: string };

export interface Review {
  id: string;
  appointmentId: string;
  userId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  petName: string;
  rating: number;
  comment: string;
  createdAt: string;
  hidden: boolean;
  reply?: string;
}

export type MedicalKind = 'consulta' | 'tratamiento' | 'cirugia' | 'examen' | 'nota';
export interface MedicalEntry {
  id: string;
  petId: string;
  date: string;
  kind: MedicalKind;
  title: string;
  description: string;
  vet: string;
  weightKg?: number;
}

export interface Vaccination {
  id: string;
  petId: string;
  vaccine: string;
  date: string;
  nextDue?: string;
  lot?: string;
  vet: string;
  notes?: string;
  /** Cuándo se avisó al cliente de la próxima dosis. */
  reminderSentAt?: string;
}

export type MessageStatus = 'new' | 'read' | 'resolved';
export interface ContactMessage {
  id: string;
  fullName: string;
  phone: string;
  serviceId: string;
  message: string;
  createdAt: string;
  status: MessageStatus;
}
export type NewContactMessage = Pick<ContactMessage, 'fullName' | 'phone' | 'serviceId' | 'message'>;

export interface DaySchedule {
  /** 0 = domingo … 6 = sábado */
  day: number;
  open: boolean;
  from: string;
  to: string;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  phone: string;
  /** Solo dígitos con código de país, p. ej. 51923399129 */
  whatsapp: string;
  email: string;
  address: string;
  mapsUrl: string;
  facebook: string;
  hours: DaySchedule[];
  /** Horas de inicio de cita ofrecidas (HH:mm). */
  slots: string[];
  /** Fechas cerradas (feriados, vacaciones) yyyy-mm-dd. */
  closedDates: string[];
  /** Plantillas de WhatsApp. Variables: {cliente} {mascota} {servicio} {fecha} {hora} {vacuna} {estado} {negocio} */
  apptReminderTemplate: string;
  vaccineReminderTemplate: string;
}
