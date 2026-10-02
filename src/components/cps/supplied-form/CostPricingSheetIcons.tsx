/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * SVG icon set converted 1:1 from the prototype's inline <svg> markup
 * (cost-price-sheet-form-candidate-v1-mobile-fold.html).
 *
 * Icons set no width/height: the prototype CSS sizes every icon through
 * its parent rule (for example .tb-btn svg, .rbtn svg, .cf-lab svg).
 */

interface CpsIconProps {
  strokeWidth?: number;
}

const base = (strokeWidth: number) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
});

export function IconChevronLeft({ strokeWidth = 2.4 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function IconSave({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2v3a1 1 0 0 0 1 1h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 22H4a2 2 0 0 1-2-2V6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z" />
    </svg>
  );
}

export function IconSun({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconMoon({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconColumns({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M9 4v16M15 4v16" />
    </svg>
  );
}

export function IconImport({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5" />
    </svg>
  );
}

export function IconMarkup({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export function IconNaira({ strokeWidth = 2.4 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.6 5 3.2 5 1.4 5 3.3-2.2 3-5 3-5-1.1-5-3" />
    </svg>
  );
}

export function IconTrash({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
    </svg>
  );
}

export function IconPlus({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function IconNote({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h7" />
    </svg>
  );
}

export function IconUp({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

export function IconDown({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function IconClose({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function IconCopy({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/** Chevron used by the sub-description toggle (svgs.chev in the prototype). */
export function IconChevronDown({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg className="chev" {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Chevron used by the client picker trigger. */
export function IconChevronDownSmall({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4 4 4-4" />
    </svg>
  );
}

export function IconGrip() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

export function IconCheck({ strokeWidth = 3 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconUser({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconMoneyOut({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
    </svg>
  );
}

export function IconMoneyIn({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
    </svg>
  );
}

export function IconCamera({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
