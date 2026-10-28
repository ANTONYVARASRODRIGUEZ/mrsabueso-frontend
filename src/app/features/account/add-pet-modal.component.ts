import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PetSex, PetSpecies } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PetsStore } from '../../core/state/pets.store';
import { UiStore } from '../../core/state/ui.store';
import { noBlank } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

/** Reduce la imagen a un JPEG pequeño para no saturar el almacenamiento local. */
function resizeToDataUrl(file: File, maxSide = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen no válida')); };
    img.src = url;
  });
}

@Component({
  selector: 'app-add-pet-modal',
  standalone: true,
  imports: [ModalComponent, ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-pet-modal.component.html',
  styleUrl: './add-pet-modal.component.scss',
})
export class AddPetModalComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly pets = inject(PetsStore);
  private readonly ui = inject(UiStore);
  private readonly toast = inject(ToastService);

  protected readonly species: { value: PetSpecies; label: string }[] = [
    { value: 'dog', label: 'Perro' }, { value: 'cat', label: 'Gato' }, { value: 'other', label: 'Otro' },
  ];
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40), noBlank]],
    species: ['dog' as PetSpecies],
    breed: ['', [Validators.maxLength(40)]],
    sex: ['' as PetSex | ''],
    birthDate: [''],
    notes: ['', [Validators.maxLength(300)]],
  });
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly photo = signal<string | null>(null);
  protected readonly photoError = signal('');
  protected readonly saving = signal(false);

  protected close(): void { this.ui.closeAddPet(); }

  protected async onPhoto(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.photoError.set('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.photoError.set('Selecciona un archivo de imagen.'); return; }
    if (file.size > 8 * 1024 * 1024) { this.photoError.set('La imagen no debe pesar más de 8 MB.'); return; }
    try { this.photo.set(await resizeToDataUrl(file)); }
    catch { this.photoError.set('No pudimos leer esa imagen.'); }
  }

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.pets.add({
      name: v.name.trim(), species: v.species, breed: v.breed.trim() || 'Mestizo',
      notes: v.notes.trim() || undefined, sex: v.sex || undefined, birthDate: v.birthDate || undefined, photoUrl: this.photo() ?? undefined,
    }).subscribe({
      next: (p) => { this.toast.success(`${p.name} fue registrado.`); this.close(); },
      error: (e: Error) => { this.saving.set(false); this.toast.error(e.message); },
    });
  }
}
