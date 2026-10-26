import { Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Confetti } from './services/confetti';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    <canvas id="confetti" aria-hidden="true"></canvas>
    <router-outlet />
  `,
  styles: `#confetti{position:fixed;inset:0;pointer-events:none;z-index:200;width:100%;height:100%}`,
})
export class App {
  constructor() {
    const confetti = inject(Confetti);
    afterNextRender(() => confetti.burst(160));
  }
}
