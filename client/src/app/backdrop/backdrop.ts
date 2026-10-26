import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

// Deterministic pseudo-random so the layout is stable between reloads.
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  left: (rand(i + 1) * 100).toFixed(1) + '%',
  size: (3 + rand(i + 31) * 5).toFixed(1) + 'px',
  dur: (14 + rand(i + 61) * 14).toFixed(1) + 's',
  delay: (-rand(i + 91) * 28).toFixed(1) + 's',
  drift: ((rand(i + 121) - 0.5) * 80).toFixed(0) + 'px',
}));

// Olive branch: leaves alternate along a gently curved stem.
const LEAVES = Array.from({ length: 11 }, (_, i) => {
  const t = (i + 1) / 12;
  const side = i % 2 ? 1 : -1;
  return {
    x: (30 + Math.sin(t * 2.6) * 28).toFixed(1),
    y: (t * 270).toFixed(1),
    rot: (side * (38 + rand(i + 7) * 14) + 20).toFixed(0),
    ry: (13 + rand(i + 17) * 5).toFixed(1),
  };
});
const OLIVES = [3, 6, 9].map((i) => ({ x: (+LEAVES[i].x + 10).toFixed(1), y: (+LEAVES[i].y + 6).toFixed(1) }));

@Component({
  selector: 'app-backdrop',
  imports: [NgTemplateOutlet],
  templateUrl: './backdrop.html',
  styleUrl: './backdrop.css',
  host: { 'aria-hidden': 'true' },
})
export class Backdrop {
  readonly sparks = SPARKS;
  readonly leaves = LEAVES;
  readonly olives = OLIVES;
  // Merlons along the top of the city wall
  readonly merlons = Array.from({ length: 56 }, (_, i) => 60 + i * 20);
}
