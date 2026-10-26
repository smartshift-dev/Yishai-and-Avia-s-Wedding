import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { EVENT } from '../event';
import { Melody } from '../services/melody';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wax seal outline: a circle with an uneven, poured edge (smoothed through segment midpoints).
const SEAL_PATH = (() => {
  const pts = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const r = 46 + Math.sin(i * 2.7) * 1.8 + Math.cos(i * 1.3) * 1.2;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  });
  const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const f = (n: number) => n.toFixed(2);
  let d = `M${mid(pts[21], pts[0]).map(f).join(' ')}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  });
  return d + 'Z';
})();

// Laurel wreath around the monogram: two branches rising from the bottom centre up each side,
// leaves in pairs that shrink towards the tips. Angles are SVG degrees (90 = bottom).
const WREATH = [
  ...[98, 113, 128, 143, 158, 173, 188, 203].map((deg, i) => ({ deg, i, dir: 1 })),
  ...[82, 67, 52, 37, 22, 7, -8, -23].map((deg, i) => ({ deg, i, dir: -1 })),
].flatMap(({ deg, i, dir }) =>
  [-1, 1].map((k) => {
    const a = (deg * Math.PI) / 180;
    const r = 33 + k * 2.4;
    const ry = (3.4 - i * 0.18).toFixed(2);
    // an ellipse's long axis is vertical, so rotating by `deg` lays it along the branch;
    // each leaf of the pair then tilts outward/inward
    const rot = deg + k * dir * 32;
    return { x: (50 + Math.cos(a) * r).toFixed(2), y: (50 + Math.sin(a) * r).toFixed(2), rx: (Number(ry) * 0.42).toFixed(2), ry, rot: rot.toFixed(0) };
  }),
);

// Deterministic pseudo-random so the scene is the same on every load.
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: (rand(i + 3) * 100).toFixed(1) + '%',
  size: (9 + rand(i + 33) * 10).toFixed(0) + 'px',
  dur: (9 + rand(i + 63) * 9).toFixed(1) + 's',
  delay: (-rand(i + 93) * 18).toFixed(1) + 's',
  sway: ((rand(i + 123) - 0.5) * 160).toFixed(0) + 'px',
  gold: i % 3 === 0,
}));

const BOKEH = Array.from({ length: 9 }, (_, i) => ({
  left: (rand(i + 201) * 100).toFixed(0) + '%',
  top: (rand(i + 231) * 100).toFixed(0) + '%',
  size: (60 + rand(i + 261) * 120).toFixed(0) + 'px',
  delay: (-rand(i + 291) * 8).toFixed(1) + 's',
}));

// Gold sparks that burst out of the envelope when it opens.
const SPARKS = Array.from({ length: 30 }, (_, i) => ({
  a: ((i / 30) * 360 + rand(i + 301) * 10).toFixed(0) + 'deg',
  dist: (110 + rand(i + 331) * 170).toFixed(0) + 'px',
  size: (3 + rand(i + 361) * 5).toFixed(1) + 'px',
}));

function daysLabel(): string {
  const ilDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' });
  const days = Math.round((Date.parse(EVENT.dayIL) - Date.parse(ilDay.format(new Date()))) / 86400000);
  if (days > 1) return `עוד ${days} ימים`;
  if (days === 1) return 'מחר!';
  if (days === 0) return 'היום!';
  return '';
}

/** Closed-envelope welcome screen. Its click is the user gesture that lets the song play. */
@Component({
  selector: 'app-intro',
  templateUrl: './intro.html',
  styleUrl: './intro.css',
  host: { '[class.opening]': 'stage() !== "closed"', '[class.leaving]': 'stage() === "leaving"' },
})
export class Intro {
  private melody = inject(Melody);
  readonly opened = output<void>();
  readonly event = EVENT;
  readonly initials = ['I', 'A']; // Yishai & Avia
  readonly sealPath = SEAL_PATH;
  readonly wreath = WREATH;
  readonly petals = PETALS;
  readonly bokeh = BOKEH;
  readonly sparks = SPARKS;
  readonly daysLabel = daysLabel();
  readonly stage = signal<'closed' | 'opening' | 'leaving'>('closed');
  private timers: number[] = [];

  constructor() {
    this.melody.preload();
    document.documentElement.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      this.timers.forEach(clearTimeout);
      document.documentElement.style.overflow = '';
    });
  }

  open(): void {
    if (this.stage() !== 'closed') return;
    this.melody.start(); // must run inside the click handler
    this.stage.set('opening');
    const [leave, done] = reduceMotion() ? [150, 500] : [2000, 2800];
    this.timers.push(
      window.setTimeout(() => this.stage.set('leaving'), leave),
      window.setTimeout(() => this.opened.emit(), done),
    );
  }
}
