// All event details live in shared/event.json.
import data from '../../../shared/event.json';

export const EVENT = {
  ...data,
  start: new Date(data.start),
  end: new Date(data.end),
  countFrom: new Date(data.countFrom),
};

const q = encodeURIComponent(EVENT.mapsQuery);
const CREDIT_EMAIL = 'smartshift315@gmail.com';
// Phones open their mail app; on a computer mailto often does nothing (no mail app set up), so open Gmail.
const touch = matchMedia('(pointer: coarse)').matches;

export const LINKS = {
  waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  gmaps: `https://www.google.com/maps/search/?api=1&query=${q}`,
  gcal:
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(EVENT.title)}` +
    `&dates=${gcalDate(EVENT.start)}/${gcalDate(EVENT.end)}` +
    `&location=${q}` +
    `&details=${encodeURIComponent(EVENT.hebrewDate + '. בשעה טובה ומוצלחת!')}`,
  credit: touch ? `mailto:${CREDIT_EMAIL}` : `https://mail.google.com/mail/?view=cm&fs=1&to=${CREDIT_EMAIL}`,
  creditNewTab: !touch,
};

// UTC "YYYYMMDDTHHMMSSZ", so the calendar converts to the guest's own zone.
function gcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
