import { Service } from '../models';

/** Catálogo inicial. Luego se administra desde Panel → Servicios. */
export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'grooming', name: 'Baño y Corte', summary: 'Estilo y limpieza para cada raza.',
    description: 'Un spa completo para que tu mascota se vea y se sienta increíble, con productos suaves y secado cuidadoso.',
    includes: ['Baño medicado', 'Corte según la raza', 'Corte de uñas', 'Limpieza de oídos'],
    icon: 'scissors', priceFrom: 50, durationMin: 90, bookable: true, active: true, image: 'images/services/grooming.jpg',
  },
  {
    id: 'consulta', name: 'Consulta y Tratamientos', summary: 'Desparasitación y controles.',
    description: 'Evaluación clínica completa a cargo de médicos veterinarios, con seguimiento y tratamiento personalizado.',
    includes: ['Examen clínico general', 'Desparasitación', 'Controles periódicos', 'Plan de tratamiento'],
    icon: 'stethoscope', priceFrom: 55, durationMin: 30, bookable: true, active: true, image: 'images/services/consulta.jpg',
  },
  {
    id: 'vacunacion', name: 'Vacunación', summary: 'Protección contra enfermedades.',
    description: 'Esquemas de vacunación para cachorros y adultos, con refuerzos y control de parásitos.',
    includes: ['Esquema de vacunas', 'Refuerzos anuales', 'Control de parásitos', 'Carnet de vacunación'],
    icon: 'syringe', priceFrom: 70, durationMin: 30, bookable: true, active: true, image: 'images/services/vacunacion.jpg',
  },
  {
    id: 'dental', name: 'Profilaxis Dental', summary: 'Limpieza bucal ultrasónica.',
    description: 'Limpieza dental profunda con ultrasonido para prevenir sarro, mal aliento y enfermedad de encías.',
    includes: ['Evaluación bucal', 'Limpieza ultrasónica', 'Pulido dental', 'Recomendaciones de cuidado'],
    icon: 'tooth', priceFrom: 110, durationMin: 60, bookable: true, active: true, image: 'images/services/dental.jpg',
  },
  {
    id: 'petshop', name: 'Pet Shop', summary: 'Alimentación y accesorios.',
    description: 'Alimento, snacks, juguetes y accesorios seleccionados para la felicidad diaria de tu mascota.',
    includes: ['Alimento balanceado', 'Snacks y premios', 'Juguetes', 'Collares y accesorios'],
    icon: 'bag', durationMin: 0, bookable: false, active: true, image: 'images/services/petshop.jpg',
  },
];
