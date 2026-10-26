import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Api } from '../services/api';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <main>
      <section class="block">
        <h2>כניסת בעלי השמחה</h2>
        @if (api.isAdmin()) {
          <p class="lead">אתם מחוברים. בדף הראשי יופיע כפתור מחיקה ליד כל ברכה.</p>
          <div class="row">
            <a class="btn primary" routerLink="/">לדף הראשי</a>
            <button class="btn quiet" type="button" (click)="logout()">התנתקות</button>
          </div>
        } @else {
          <p class="lead">הכניסה מאפשרת למחוק ברכות. אורחים לא צריכים להיכנס.</p>
          <form class="card" (submit)="login($event)" novalidate>
            <label>סיסמה
              <input type="password" name="password" autocomplete="current-password" [(ngModel)]="password" required>
            </label>
            <div class="row"><button class="btn primary" type="submit" [disabled]="busy()">כניסה</button></div>
            <p class="msg err" role="status">{{ error() }}</p>
          </form>
          <p class="note"><a routerLink="/">חזרה לדף הראשי</a></p>
        }
      </section>
    </main>
  `,
})
export class Admin {
  readonly api = inject(Api);
  private router = inject(Router);
  readonly password = signal('');
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    void this.api.session().catch(() => {});
  }

  async login(e: Event): Promise<void> {
    e.preventDefault();
    if (!this.password()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.login(this.password());
      this.password.set('');
      await this.router.navigateByUrl('/');
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      this.error.set(status === 429 ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.' : status === 401 ? 'הסיסמה שגויה.' : 'הכניסה לא הצליחה. נסו שוב.');
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.api.logout();
  }
}
