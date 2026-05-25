import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countdown',
  standalone: true,
  pure: false
})
export class CountdownPipe implements PipeTransform {
  transform(value: string | Date | undefined): string {
    if (!value) return '';

    const targetDate = new Date(value);
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Cerrada';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `⏳ Cierra en: ${days}d ${hours}h`;
    } else if (hours > 0) {
      return `⏳ Cierra en: ${hours}h ${minutes}m`;
    } else {
      return `⚠️ Cierra en: ${minutes}m (Hoy)`;
    }
  }
}
