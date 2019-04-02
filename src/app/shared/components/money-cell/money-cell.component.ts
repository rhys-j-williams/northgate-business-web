import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Right aligned amount with debit/credit colour. Used in every table in the app. */
@Component({
  selector: 'mbz-money-cell',
  template: `<span class="mbz-money" [class.mbz-money--debit]="minor < 0" [class.mbz-money--credit]="minor > 0 && highlightCredit">{{ minor | mbzMoney:accounting }}</span>`,
  styles: [`
    .mbz-money { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mbz-money--debit { color: var(--mbz-debit, #8a1f11); }
    .mbz-money--credit { color: var(--mbz-credit, #1e6b3a); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoneyCellComponent {
  @Input() minor: number;
  @Input() accounting = true;
  @Input() highlightCredit = false;
}
