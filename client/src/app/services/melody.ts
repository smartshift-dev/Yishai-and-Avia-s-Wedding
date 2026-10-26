import { Injectable, signal } from '@angular/core';

const SRC = 'chuppah.mp3';
const VOLUME = 0.7;

/**
 * Background chuppah song. Browsers only allow audio after the visitor interacts with the page,
 * so start() must be called from a click handler (the envelope on the intro screen).
 */
@Injectable({ providedIn: 'root' })
export class Melody {
  readonly playing = signal(false);
  readonly unavailable = signal(false);

  private audio: HTMLAudioElement | null = null;
  private fadeTimer = 0;

  private el(): HTMLAudioElement {
    if (!this.audio) {
      const a = new Audio(SRC);
      a.loop = true;
      a.preload = 'auto';
      a.addEventListener('play', () => this.playing.set(true));
      a.addEventListener('pause', () => this.playing.set(false));
      a.addEventListener('error', () => this.unavailable.set(true));
      this.audio = a;
    }
    return this.audio;
  }

  /** Begin loading early so playback starts instantly on the first click. */
  preload(): void {
    this.el().load();
  }

  start(): void {
    if (!this.playing()) void this.play();
  }

  toggle(): void {
    if (this.playing()) this.stop();
    else void this.play();
  }

  stop(): void {
    clearInterval(this.fadeTimer);
    this.audio?.pause();
  }

  private async play(): Promise<void> {
    const a = this.el();
    a.volume = 0;
    try {
      await a.play();
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotAllowedError') this.unavailable.set(true);
      return;
    }
    clearInterval(this.fadeTimer);
    this.fadeTimer = window.setInterval(() => {
      a.volume = Math.min(VOLUME, a.volume + 0.05);
      if (a.volume >= VOLUME) clearInterval(this.fadeTimer);
    }, 80);
  }
}
