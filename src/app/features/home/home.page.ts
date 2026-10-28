import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReviewsStore } from '../../core/state/reviews.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PhotoComponent, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly settings = inject(SettingsStore);
  private readonly reviewsStore = inject(ReviewsStore);
  private readonly servicesStore = inject(ServicesStore);
  protected readonly services = computed(() => this.servicesStore.active().slice(0, 4));
  protected readonly wa = this.settings.whatsappLink();
  protected readonly phone = computed(() => this.settings.settings().phone);
  protected readonly reviews = computed(() => this.reviewsStore.visible().filter((r) => r.rating >= 4).slice(0, 3));
  protected readonly average = this.reviewsStore.average;
  protected readonly reviewCount = computed(() => this.reviewsStore.visible().length);

  protected readonly steps = [
    { n: '1', title: 'Elige a tu mascota', text: 'Selecciona a quién visitaremos o registra a un nuevo integrante.' },
    { n: '2', title: 'Escoge el servicio', text: 'Baño y corte, consulta, vacunación o profilaxis dental.' },
    { n: '3', title: 'Reserva fecha y hora', text: 'Mira los horarios disponibles y confirma en segundos.' },
  ];

  protected readonly features = [
    { icon: 'stethoscope' as const, title: 'Atención médica experta', text: 'Médicos veterinarios para controles, vacunas y tratamientos con cariño y rigor.' },
    { icon: 'scissors' as const, title: 'Spa y grooming profesional', text: 'Baño y corte según la raza, con productos suaves y trato paciente.' },
    { icon: 'whatsapp' as const, title: 'Recordatorios por WhatsApp', text: 'Te avisamos de tus citas para que nunca se te pase una visita.' },
  ];

  protected readonly faqs = [
    { q: '¿Cómo reservo una cita?', a: 'Crea tu cuenta, elige a tu mascota, el servicio y un horario disponible. Recibirás la confirmación y un recordatorio por WhatsApp.' },
    { q: '¿Puedo cancelar una cita?', a: 'Sí. Desde “Mi cuenta” puedes cancelar o reprogramar tus citas próximas para liberar el horario.' },
    { q: '¿Cómo pago el servicio?', a: 'Por ahora el pago se realiza en el local. El pago en línea estará disponible próximamente.' },
    { q: '¿Atienden a gatos y otras mascotas?', a: 'Sí, atendemos perros, gatos y otras mascotas. Indícalo al registrarla para preparar mejor la visita.' },
  ];
}
