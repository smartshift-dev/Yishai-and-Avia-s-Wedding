import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Fades an element in the first time it scrolls into view. */
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class Reveal {
  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('in');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    inject(DestroyRef).onDestroy(() => io.disconnect());
  }
}
