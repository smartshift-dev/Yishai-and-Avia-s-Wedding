import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Countdown } from '../countdown/countdown';
import { Wishes } from '../wishes/wishes';
import { Reveal } from '../reveal';
import { Backdrop } from '../backdrop/backdrop';
import { Intro } from '../intro/intro';
import { EVENT, LINKS } from '../event';
import { Api } from '../services/api';
import { Confetti } from '../services/confetti';
import { Melody } from '../services/melody';

// The envelope is shown once per page load, not again when returning from /admin.
let introSeen = false;

@Component({
  selector: 'app-home',
  imports: [Countdown, Wishes, RouterLink, Reveal, Backdrop, Intro],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private confetti = inject(Confetti);
  private melody = inject(Melody);
  readonly api = inject(Api);
  readonly event = EVENT;
  readonly links = LINKS;
  readonly playing = this.melody.playing;
  readonly musicUnavailable = this.melody.unavailable;
  readonly showIntro = signal(!introSeen);

  constructor() {
    void this.api.session().catch(() => {});
    inject(DestroyRef).onDestroy(() => this.melody.stop());
  }

  onOpened(): void {
    introSeen = true;
    this.showIntro.set(false);
  }

  toggleMusic(): void {
    this.melody.toggle();
  }

  burst(): void {
    this.confetti.burst(180);
  }
}
