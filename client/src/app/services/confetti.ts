import { Injectable } from '@angular/core';

interface Piece {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; r: number; vr: number;
  c: string; life: number;
}

@Injectable({ providedIn: 'root' })
export class Confetti {
  private cv: HTMLCanvasElement | null = null;
  private cx: CanvasRenderingContext2D | null = null;
  private parts: Piece[] = [];
  private raf = 0;
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private ensure(): boolean {
    if (this.cx) return true;
    this.cv = document.getElementById('confetti') as HTMLCanvasElement | null;
    this.cx = this.cv?.getContext('2d') ?? null;
    if (!this.cx) return false;
    this.size();
    addEventListener('resize', () => this.size());
    return true;
  }

  private size(): void {
    const r = devicePixelRatio || 1;
    this.cv!.width = innerWidth * r;
    this.cv!.height = innerHeight * r;
    this.cx!.setTransform(r, 0, 0, r, 0, 0);
  }

  burst(n: number): void {
    if (this.reduce || !this.ensure()) return;
    const cs = getComputedStyle(document.documentElement);
    const colors = [cs.getPropertyValue('--gold').trim(), cs.getPropertyValue('--wine').trim(), '#ffffff', '#6E8BC6', '#E9D9B0'];
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        vx: -1.2 + Math.random() * 2.4, vy: 2 + Math.random() * 3,
        r: Math.random() * 6.3, vr: -0.15 + Math.random() * 0.3,
        c: colors[i % colors.length], life: 0,
      });
    }
    if (!this.raf) this.raf = requestAnimationFrame(() => this.step());
  }

  private step(): void {
    const cx = this.cx!;
    cx.clearRect(0, 0, innerWidth, innerHeight);
    this.parts = this.parts.filter((p) => p.y < innerHeight + 30);
    for (const p of this.parts) {
      p.x += p.vx + Math.sin(p.life++ / 18) * 0.6;
      p.y += p.vy;
      p.r += p.vr;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.r);
      cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r)));
      cx.restore();
    }
    this.raf = this.parts.length ? requestAnimationFrame(() => this.step()) : 0;
    if (!this.raf) cx.clearRect(0, 0, innerWidth, innerHeight);
  }
}
