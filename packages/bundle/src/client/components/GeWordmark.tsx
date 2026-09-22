import * as React from 'react';

/**
 * 10GE wordmark for the sidebar brand slot, redrawn from the supplied brand
 * artwork (the supplied bitmap carries a metallic plate and a generator
 * watermark, neither of which survives a 24px row).
 *
 * Geometry: one 70-unit band for the whole lockup — cap height of "1"/"G"/"E"
 * equals the diameter of the eye that replaces the "0", so the mark keeps a
 * single optical height at any requested size.
 */
const BAND_HEIGHT = 70;
const BAND_WIDTH = 235;
const BLUE = '#2670DA';
const INK = '#0A1526';
/**
 * The iris barrel tracks the surrounding label colour, so the mark survives the
 * light theme where a fixed pale grey ring would vanish into the #f9fafb
 * sidebar. The 0.85 keeps the softer steel look of the artwork in dark theme.
 */
const BARREL = 'currentColor';
const BARREL_OPACITY = 0.85;
const EYE = { cx: 66, cy: 50 };

/** 24 iris ticks, generated so the ring stays evenly spaced at every size. */
const TICKS = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2;
  const point = (radius: number) => [EYE.cx + Math.cos(angle) * radius, EYE.cy + Math.sin(angle) * radius] as const;
  return { from: point(30.4), to: point(34.3) };
});

export type GeWordmarkProps = {
  readonly height: number;
};

export function GeWordmark({ height }: GeWordmarkProps) {
  return (
    <svg
      width={(height * BAND_WIDTH) / BAND_HEIGHT}
      height={height}
      viewBox={`0 15 ${BAND_WIDTH} ${BAND_HEIGHT}`}
      focusable={false}
      aria-hidden
      data-testid="workdsh-brand-mark"
      style={{ display: 'block' }}
    >
      <path d="M16 15 L0 31 L0 49 L16 33 L16 85 L28 85 L28 15 Z" fill={BLUE} />
      <circle cx={EYE.cx} cy={EYE.cy} r={32.5} fill="none" stroke={BARREL} strokeOpacity={BARREL_OPACITY} strokeWidth={5} />
      <g stroke={BLUE} strokeWidth={1.8}>
        {TICKS.map(({ from, to }, index) => (
          <line key={index} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} />
        ))}
      </g>
      <ellipse cx={EYE.cx} cy={EYE.cy} rx={22} ry={17.5} fill="#FFFFFF" />
      <circle cx={EYE.cx} cy={EYE.cy} r={15.5} fill={BLUE} />
      <circle cx={EYE.cx} cy={EYE.cy} r={6.5} fill={INK} />
      <circle cx={61} cy={44} r={3} fill="#FFFFFF" />
      <path d="M171.58 28.45 A35 35 0 1 0 178.81 53.66 L167.87 52.51 A24 24 0 1 1 162.91 35.22 Z" fill={BLUE} />
      <rect x={140} y={44} width={39} height={12} fill={BLUE} />
      <rect x={187} y={15} width={12} height={70} fill={BLUE} />
      <rect x={187} y={15} width={48} height={12} fill={BLUE} />
      <rect x={187} y={44} width={36} height={12} fill={BLUE} />
      <rect x={187} y={73} width={48} height={12} fill={BLUE} />
    </svg>
  );
}
