import { Pipe, PipeTransform } from '@angular/core';
import { maskAccountNumber } from '@meridian/domain-fixtures';

@Pipe({ name: 'mbzMaskAccount' })
export class MaskAccountPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return maskAccountNumber(value);
  }
}
