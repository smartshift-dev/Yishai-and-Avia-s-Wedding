import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    <canvas id="confetti" aria-hidden="true"></canvas>
    <router-outlet />
  `,
  styles: `#confetti{position:fixed;inset:0;pointer-events:none;z-index:50;width:100%;height:100%}`,
})
export class App {}
