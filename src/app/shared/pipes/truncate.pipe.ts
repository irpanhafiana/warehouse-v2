import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 16, ellipsis = '...'): string {
    if (!value) return '';
    return value.length <= limit ? value : value.substring(0, limit) + ellipsis;
  }
}
