import { Component } from '@angular/core';

@Component({
  selector: 'mbz-not-found',
  template: `
    <cn-page-header title="Page not found" lede="That link is out of date or you do not have access to it."></cn-page-header>
    <p><a routerLink="/accounts">Back to accounts</a></p>
  `
})
export class NotFoundComponent {}
