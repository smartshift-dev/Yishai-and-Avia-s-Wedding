import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Wish {
  id: number;
  name: string;
  text: string;
  audio: string | null;
  ts: number;
  mine: boolean;
}

/** "keep" leaves the stored recording, null removes it, a data URL replaces it. */
export type AudioChange = 'keep' | null | string;

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  readonly isAdmin = signal(false);

  async session(): Promise<void> {
    const s = await firstValueFrom(this.http.get<{ isAdmin: boolean }>('/api/session'));
    this.isAdmin.set(s.isAdmin);
  }

  wishes(): Promise<Wish[]> {
    return firstValueFrom(this.http.get<Wish[]>('/api/wishes'));
  }

  saveMine(name: string, text: string, audio: AudioChange): Promise<Wish> {
    return firstValueFrom(this.http.put<Wish>('/api/wishes/mine', { name, text, audio }));
  }

  deleteMine(): Promise<unknown> {
    return firstValueFrom(this.http.delete('/api/wishes/mine'));
  }

  deleteWish(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(`/api/wishes/${id}`));
  }

  async login(password: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/admin/login', { password }));
    this.isAdmin.set(true);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/admin/logout', {}));
    this.isAdmin.set(false);
  }

  /** Calls onChange whenever someone adds, edits or deletes a wish. Returns a stop function. */
  watchWishes(onChange: () => void): () => void {
    if (typeof EventSource === 'undefined') return () => {};
    const es = new EventSource('/api/wishes/stream');
    es.addEventListener('wishes', onChange);
    return () => es.close();
  }
}

export function errorText(e: unknown): string {
  const status = e instanceof HttpErrorResponse ? e.status : 0;
  const code = e instanceof HttpErrorResponse ? e.error?.error : '';
  if (status === 413 || code === 'audio_size') return 'ההקלטה גדולה מדי. נסו הקלטה קצרה יותר.';
  if (code === 'audio') return 'פורמט ההקלטה לא נתמך. נסו להקליט שוב או לכתוב ברכה.';
  if (code === 'empty') return 'כתבו ברכה או הקליטו אותה.';
  if (status === 429) return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.';
  if (status === 403) return 'אין הרשאה לפעולה הזו.';
  return 'השמירה לא הצליחה. בדקו את החיבור ונסו שוב.';
}
