import { Component, DestroyRef, inject, signal } from '@angular/core';
import { EVENT } from '../event';
import { Confetti } from '../services/confetti';

const ilDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
const pad = (n: number) => (n < 10 ? '0' + n : String(n));

@Component({
  selector: 'app-countdown',
  template: `
    <section class="count" [class.done]="done()" aria-live="polite">
      @if (!done()) {
        <div class="cells">
          <div class="cell"><span class="num">{{ d() }}</span><span class="lbl">ימים</span></div>
          <div class="cell"><span class="num">{{ h() }}</span><span class="lbl">שעות</span></div>
          <div class="cell"><span class="num">{{ m() }}</span><span class="lbl">דקות</span></div>
          <div class="cell"><span class="num">{{ s() }}</span><span class="lbl">שניות</span></div>
        </div>
        <div class="bar" role="progressbar" aria-label="הדרך לחתונה" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="pctRound()">
          <span [style.width.%]="pct()"></span>
        </div>
        <p class="barnote">עברנו {{ pctFloor() }}% מהדרך</p>
      } @else {
        <p class="mazal gold-text">מזל טוב!</p>
        <p class="bless">{{ couple }}, שתזכו לבנות בית נאמן בישראל</p>
      }
    </section>
  `,
})
export class Countdown {
  private confetti = inject(Confetti);
  readonly couple = EVENT.couple.join(' ו');
  readonly done = signal(false);
  readonly d = signal('–');
  readonly h = signal('–');
  readonly m = signal('–');
  readonly s = signal('–');
  readonly pct = signal(0);
  readonly pctRound = signal(0);
  readonly pctFloor = signal(0);

  constructor() {
    this.tick();
    const id = setInterval(() => this.tick(), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  private tick(): void {
    const now = new Date();
    const diff = EVENT.start.getTime() - now.getTime();
    // From the wedding day itself (Israel time) onward, celebrate instead of counting.
    if (ilDay.format(now) >= EVENT.dayIL || diff <= 0) {
      if (!this.done()) {
        this.done.set(true);
        setTimeout(() => this.confetti.burst(260), 400);
      }
      return;
    }
    const sec = Math.floor(diff / 1000);
    this.d.set(String(Math.floor(sec / 86400)));
    this.h.set(pad(Math.floor((sec % 86400) / 3600)));
    this.m.set(pad(Math.floor((sec % 3600) / 60)));
    this.s.set(pad(sec % 60));
    const total = EVENT.start.getTime() - EVENT.countFrom.getTime();
    const p = Math.max(0, Math.min(100, ((now.getTime() - EVENT.countFrom.getTime()) / total) * 100));
    this.pct.set(+p.toFixed(2));
    this.pctRound.set(Math.round(p));
    this.pctFloor.set(Math.floor(p));
  }
}
