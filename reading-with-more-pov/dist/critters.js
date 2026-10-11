// The three characters on the reading couch, as SVG: soft, bubbly shapes
// in flat colors, with eyes only and an accessory each. They sit facing the
// article at an angle, so the face group is turned almost all the way round:
// clipped to the head, only an eye peeks past its side. When they turn toward
// you to speak, the face slides round into view and the back group slides
// away, as a head turning would, never fading (see .critter-art in style.css).
// The body is the reader's color through CSS, so the same shape can sit in for
// any reader.

const INK = '#10131a';

// Each design: the body's outline, round all the way around like a bubble
// (for the body, and to clip the face to), what sits on top of it, what shows
// on the back of it, and the face.
const DESIGNS = {
  // Professor, the skeptical researcher: a gumdrop with round glasses and one
  // raised brow.
  researcher: {
    shape:
      'M60 14 C92 14 108 40 108 72 V94 C108 110 90 118 60 118 C30 118 12 110 12 94 V72 C12 40 28 14 60 14 Z',
    top: '',
    back: '',
    face: `
      <path d="M64 42 Q73 36 84 41" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="45" cy="60" r="13" fill="#ffffff2e" stroke="${INK}" stroke-width="3.5" />
      <circle cx="75" cy="60" r="13" fill="#ffffff2e" stroke="${INK}" stroke-width="3.5" />
      <path d="M58 59 Q60 56.5 62 59" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" />
      <path d="M32 60 L8 60 M88 60 L112 60" stroke="${INK}" stroke-width="3" stroke-linecap="round" />
      <ellipse class="eye" cx="45" cy="61" rx="4.5" ry="5" fill="${INK}" />
      <ellipse class="eye" cx="75" cy="60" rx="4.5" ry="6.5" fill="${INK}" />`,
  },
  // Buzz, your buddy: a rounded bot in a backwards cap, with a wink. From behind
  // you see the cap's brim; turned around, the strap on his forehead.
  buddy: {
    shape:
      'M48 24 H72 A34 34 0 0 1 106 58 V86 A32 32 0 0 1 74 118 H46 A32 32 0 0 1 14 86 V58 A34 34 0 0 1 48 24 Z',
    top: `
      <path d="M20 46 C22 22 40 14 60 14 C80 14 98 22 100 46 Z" fill="#e5484d" />
      <circle cx="60" cy="15" r="3.5" fill="#c43c41" />`,
    back: `<path d="M26 44 C30 60 90 60 94 44 Z" fill="#c43c41" />`,
    face: `
      <rect x="48" y="42" width="24" height="9" rx="4" fill="${INK}" opacity="0.35" />
      <path class="eye" d="M40 66 Q46 60 52 66" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
      <ellipse class="eye" cx="75" cy="65" rx="5" ry="6.5" fill="${INK}" />`,
  },
  // Coach, the coach and mentor: a soft bean with a sprout growing out of their
  // head, a sweatband, and warm, smiling eyes.
  coach: {
    shape:
      'M58 27 C89 25 106 52 105 80 C104 104 88 118 60 118 C32 118 16 106 15 82 C14 52 30 29 58 27 Z',
    top: `
      <g class="sprout">
        <path d="M59 29 C58 21 60 15 63 9.5" fill="none" stroke="#5fbf73" stroke-width="3" stroke-linecap="round" />
        <path d="M61 16 C53 8.5 44.5 12 45.5 18.5 C51.5 21.5 57.5 19.5 61 16 Z" fill="#7bd88f" />
        <path d="M63 11.5 C70 3.5 79 6 78 12.5 C72 15.5 66 14.5 63 11.5 Z" fill="#5fc274" />
      </g>`,
    band: `
      <path d="M10 52 C40 43 80 43 110 51 L110 60 C80 52 40 52 10 61 Z" fill="#f4f1ea" />
      <path d="M10 55.5 C40 47 80 47 110 54.5" fill="none" stroke="#e5484d" stroke-width="2.5" />`,
    back: '',
    face: `
      <path class="eye" d="M39 72 Q45 65 51 72" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
      <path class="eye" d="M69 72 Q75 65 81 72" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />`,
  },
};
// Each reader's design, and the shade of their bubble they wear: Professor
// gray, Buzz a light version of his blue, Coach the gold of theirs. Without a
// shade, a reader wears a bright version of their own color (see .critter-art
// in style.css).
const DESIGN = { iris: 'researcher', milo: 'buddy', june: 'coach' };
export const BODY = { iris: '#9ba1aa', milo: '#83b7ef', june: '#f2c15a' };
export const designOf = reader => DESIGN[reader.id] ?? 'researcher';

let count = 0;
export function critter(design) {
  const { shape, top, band = '', back, face } = DESIGNS[design];
  const clip = `critter-head-${++count}`;
  // Buzz's cap sits over his head; everyone else's top sits behind it.
  const over = design === 'buddy';
  return `<svg class="critter-art ${design}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs><clipPath id="${clip}"><path d="${shape}" /></clipPath></defs>
    ${over ? '' : `<g class="top">${top}</g>`}
    <path class="body" d="${shape}" />
    <g clip-path="url(#${clip})">
      ${band}
      <g class="back">${back}</g>
      <g class="face">${face}</g>
    </g>
    ${over ? `<g class="top">${top}</g>` : ''}
  </svg>`;
}

// A reader's face as a small portrait, for the reading dot: round, turned a
// little to the right, eyes on the text, with their glasses, cap, or sprout.
const PORTRAITS = {
  researcher: `
    <path d="M3.5 16.6 L10.6 16.9" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" />
    <circle cx="15" cy="17" r="4.3" fill="#ffffff2e" stroke="${INK}" stroke-width="1.6" />
    <circle cx="24.2" cy="17" r="4.3" fill="#ffffff2e" stroke="${INK}" stroke-width="1.6" />
    <path d="M19.3 16.7 Q19.6 15.5 19.9 16.7" fill="none" stroke="${INK}" stroke-width="1.3" />
    <path d="M20.6 10.6 Q24 8.4 28 10" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" />
    <ellipse cx="16.4" cy="17.5" rx="1.4" ry="1.6" fill="${INK}" />
    <ellipse cx="25.6" cy="17.1" rx="1.4" ry="2" fill="${INK}" />`,
  buddy: `
    <path d="M1 14 C1.5 5.5 8.5 1 16 1 C23.5 1 30.5 5.5 31 14 Z" fill="#e5484d" />
    <rect x="12.5" y="11.5" width="8" height="2.6" rx="1.3" fill="${INK}" opacity="0.35" />
    <path d="M12.6 20.3 Q15.2 17.6 17.8 20.3" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" />
    <ellipse cx="25" cy="19.6" rx="1.6" ry="2.1" fill="${INK}" />`,
  coach: `
    <path d="M0 11 C8 8.5 24 8.5 32 11 L32 14.2 C24 11.7 8 11.7 0 14.2 Z" fill="#f4f1ea" />
    <path d="M0 12.4 C8 9.9 24 9.9 32 12.4" fill="none" stroke="#e5484d" stroke-width="1" />
    <path d="M12.5 21 Q15 18 17.5 21 M21.5 21 Q24 18 26.5 21" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" />`,
};
const SPROUT = `
  <path d="M16 1.5 C15.8 -1 16.4 -2.6 17.4 -4" fill="none" stroke="#5fbf73" stroke-width="1.3" stroke-linecap="round" />
  <path d="M16.6 -1.8 C13.8 -4.4 10.8 -3.2 11.2 -0.9 C13.3 0.2 15.4 -0.5 16.6 -1.8 Z" fill="#7bd88f" />
  <path d="M17.3 -3.3 C19.8 -6.1 23 -5.2 22.6 -2.9 C20.5 -1.9 18.4 -2.2 17.3 -3.3 Z" fill="#5fc274" />`;

export function portrait(reader) {
  const design = designOf(reader);
  const clip = `critter-portrait-${++count}`;
  const body = BODY[reader.id] ? ` style="--seat-body: ${BODY[reader.id]}"` : '';
  return `<svg class="portrait critter-art" viewBox="0 0 32 32" aria-hidden="true" focusable="false"${body}>
    <defs><clipPath id="${clip}"><circle cx="16" cy="16" r="15" /></clipPath></defs>
    ${design === 'coach' ? SPROUT : ''}
    <circle class="body" cx="16" cy="16" r="15" />
    <g clip-path="url(#${clip})">${PORTRAITS[design]}</g>
  </svg>`;
}
