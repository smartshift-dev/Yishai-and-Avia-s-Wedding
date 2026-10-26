import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, AudioChange, Wish, errorText } from '../services/api';
import { Confetti } from '../services/confetti';

const MAX_REC = 30;
const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const opts = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  return opts.find((o) => MediaRecorder.isTypeSupported?.(o)) ?? '';
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

type Msg = { text: string; kind: '' | 'ok' | 'err' };

@Component({
  selector: 'app-wishes',
  imports: [FormsModule],
  templateUrl: './wishes.html',
  styleUrl: './wishes.css',
})
export class Wishes {
  private api = inject(Api);
  private confetti = inject(Confetti);
  readonly isAdmin = this.api.isAdmin;

  readonly list = signal<Wish[]>([]);
  readonly loadError = signal(false);
  readonly mine = computed(() => this.list().find((w) => w.mine) ?? null);

  readonly name = signal('');
  readonly text = signal('');
  readonly msg = signal<Msg>({ text: '', kind: '' });
  readonly saving = signal(false);
  readonly armedDelete = signal<number | 'mine' | null>(null);

  // Recording: `audio` is what will be sent; `previewUrl` is what the <audio> preview plays.
  readonly recording = signal(false);
  readonly recSeconds = signal(0);
  readonly audio = signal<AudioChange>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly hasRecording = computed(() => this.audio() !== null);

  private recorder: MediaRecorder | null = null;
  private recTimer = 0;
  private prefilled = false;
  private disarmTimer = 0;

  constructor() {
    void this.refresh();
    const stop = this.api.watchWishes(() => void this.refresh());
    inject(DestroyRef).onDestroy(() => {
      stop();
      clearInterval(this.recTimer);
      if (this.recorder?.state === 'recording') this.recorder.stop();
      this.revokePreview();
    });
  }

  when(ts: number): string {
    return fmt.format(new Date(ts));
  }

  private async refresh(): Promise<void> {
    try {
      this.list.set(await this.api.wishes());
      this.loadError.set(false);
      const mine = this.mine();
      if (mine && !this.prefilled) {
        this.prefilled = true;
        this.name.set(mine.name);
        this.text.set(mine.text);
        if (mine.audio) this.setAudio('keep', mine.audio);
      }
    } catch {
      this.loadError.set(true);
    }
  }

  private say(text: string, kind: Msg['kind'] = ''): void {
    this.msg.set({ text, kind });
  }

  /* ---------- recording ---------- */
  private revokePreview(): void {
    const u = this.previewUrl();
    if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
  }

  private setAudio(change: AudioChange, preview: string | null): void {
    this.revokePreview();
    this.audio.set(change);
    this.previewUrl.set(preview);
  }

  async toggleRecording(): Promise<void> {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
      return;
    }
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      this.say('הדפדפן הזה לא תומך בהקלטה. אפשר לכתוב ברכה במקום.', 'err');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.say('אין גישה למיקרופון. אפשר לאשר גישה בדפדפן או לכתוב ברכה במקום.', 'err');
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { audioBitsPerSecond: 32000, ...(mime ? { mimeType: mime } : {}) });
    this.recorder = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(this.recTimer);
      this.recording.set(false);
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      this.setAudio(await readAsDataUrl(blob), URL.createObjectURL(blob));
      this.say('ההקלטה מוכנה. אפשר להאזין לה ולשלוח.', 'ok');
    };
    rec.start();
    const started = Date.now();
    this.recSeconds.set(0);
    this.recording.set(true);
    this.say('');
    this.recTimer = window.setInterval(() => {
      const sec = Math.min(MAX_REC, Math.floor((Date.now() - started) / 1000));
      this.recSeconds.set(sec);
      if (sec >= MAX_REC && rec.state === 'recording') rec.stop();
    }, 250);
  }

  clearRecording(): void {
    this.setAudio(null, null);
  }

  timerLabel(): string {
    const s = this.recSeconds();
    return `0:${s < 10 ? '0' + s : s} / 0:${MAX_REC}`;
  }

  /* ---------- save / delete ---------- */
  async submit(e: Event): Promise<void> {
    e.preventDefault();
    const name = this.name().trim();
    const text = this.text().trim();
    if (!name) {
      this.say('כתבו שם כדי שהחתן והכלה ידעו ממי הברכה.', 'err');
      document.getElementById('wName')?.focus();
      return;
    }
    if (!text && !this.hasRecording()) {
      this.say('כתבו ברכה או הקליטו אותה.', 'err');
      document.getElementById('wText')?.focus();
      return;
    }
    this.saving.set(true);
    this.say('שומרים…');
    try {
      const saved = await this.api.saveMine(name, text, this.audio());
      this.prefilled = true;
      if (saved.audio) this.setAudio('keep', saved.audio);
      await this.refresh();
      this.say('הברכה נשמרה. תודה!', 'ok');
      this.confetti.burst(90);
    } catch (err) {
      this.say(errorText(err), 'err');
    } finally {
      this.saving.set(false);
    }
  }

  /** Two-step delete: the first click arms the button for 4 seconds. */
  private confirm(key: number | 'mine'): boolean {
    clearTimeout(this.disarmTimer);
    if (this.armedDelete() !== key) {
      this.armedDelete.set(key);
      this.disarmTimer = window.setTimeout(() => this.armedDelete.set(null), 4000);
      return false;
    }
    this.armedDelete.set(null);
    return true;
  }

  async deleteMine(): Promise<void> {
    if (!this.confirm('mine')) return;
    try {
      await this.api.deleteMine();
      this.text.set('');
      this.clearRecording();
      this.prefilled = false;
      await this.refresh();
      this.say('הברכה נמחקה.', 'ok');
    } catch (err) {
      this.say(errorText(err), 'err');
    }
  }

  async deleteAny(w: Wish): Promise<void> {
    if (!this.confirm(w.id)) return;
    try {
      await this.api.deleteWish(w.id);
      await this.refresh();
    } catch (err) {
      this.say(errorText(err), 'err');
    }
  }
}
