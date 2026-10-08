// Reel symbols for Milk Money. Plain SVG, ink outlines, pump.fun colours.
import type { ReactElement } from "react";

export type Sym = "cow" | "bell" | "milk" | "candle" | "clover" | "hay" | "moon";

const INK = "#0b0b0e";
const s = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const CowIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M30 26 C24 20 22 12 24 6 C30 12 36 16 42 18 Z" fill="#fde68a" {...s} />
    <path d="M70 26 C76 20 78 12 76 6 C70 12 64 16 58 18 Z" fill="#fde68a" {...s} />
    <path d="M26 30 C16 24 6 26 2 32 C8 40 18 40 26 38 Z" fill="#fffdf6" {...s} />
    <path d="M74 30 C84 24 94 26 98 32 C92 40 82 40 74 38 Z" fill="#fffdf6" {...s} />
    <path d="M44 14 H56 C74 14 82 26 82 42 C82 56 78 64 72 70 L28 70 C22 64 18 56 18 42 C18 26 26 14 44 14 Z" fill="#fffdf6" {...s} />
    <path d="M58 16 C70 14 82 22 82 34 C80 44 70 46 62 42 C56 38 52 28 58 16 Z" fill="#86efac" stroke="none" />
    <path d="M44 14 H56 C74 14 82 26 82 42 C82 56 78 64 72 70 L28 70 C22 64 18 56 18 42 C18 26 26 14 44 14 Z" fill="none" {...s} />
    <circle cx="39" cy="38" r="6" fill="#fff" {...s} strokeWidth={3.5} />
    <circle cx="61" cy="38" r="6" fill="#fff" {...s} strokeWidth={3.5} />
    <circle cx="40" cy="39.5" r="2.6" fill={INK} />
    <circle cx="60" cy="39.5" r="2.6" fill={INK} />
    <ellipse cx="50" cy="66" rx="26" ry="16" fill="#ffc2d8" {...s} />
    <ellipse cx="42" cy="64" rx="3" ry="4.4" fill={INK} />
    <ellipse cx="58" cy="64" rx="3" ry="4.4" fill={INK} />
    <rect x="22" y="80" width="56" height="17" rx="5" fill={INK} />
    <text x="50" y="93" textAnchor="middle" fontSize="13" fontWeight="900" fill="#86efac" fontFamily="var(--font-display), sans-serif">
      WILD
    </text>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 10 C32 10 26 26 26 42 L18 72 Q50 84 82 72 L74 42 C74 26 68 10 50 10 Z" fill="#facc15" {...s} />
    <path d="M30 56 Q50 64 70 56" fill="none" stroke="#a16207" strokeWidth="5" strokeLinecap="round" />
    <path d="M36 24 Q40 18 46 17" fill="none" stroke="#fff7cc" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="82" r="8" fill={INK} />
    <path d="M42 8 h16" {...s} />
  </svg>
);

const MilkIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M36 18 h28 v12 c10 6 14 14 14 26 v30 c0 6 -4 10 -10 10 h-36 c-6 0 -10 -4 -10 -10 v-30 c0 -12 4 -20 14 -26 Z" fill="#ffffff" {...s} />
    <rect x="34" y="8" width="32" height="13" rx="3" fill="#86efac" {...s} />
    <rect x="26" y="50" width="48" height="22" rx="4" fill="#22c55e" {...s} />
    <text x="50" y="66" textAnchor="middle" fontSize="13" fontWeight="900" fill="#052e16" fontFamily="var(--font-display), sans-serif">
      MILK
    </text>
  </svg>
);

const CandleIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M30 40 V52 M30 82 V94" {...s} strokeWidth={5} />
    <rect x="18" y="52" width="24" height="30" rx="4" fill="#4ade80" {...s} />
    <path d="M66 4 V16 M66 74 V88" {...s} strokeWidth={5} />
    <rect x="52" y="16" width="28" height="58" rx="5" fill="#4ade80" {...s} />
    <path d="M60 24 V50" stroke="#bbf7d0" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const CloverIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 54 C56 74 60 84 72 94" fill="none" {...s} strokeWidth={6} />
    {[0, 90, 180, 270].map((r) => (
      <path
        key={r}
        transform={`rotate(${r} 50 46)`}
        d="M50 46 C40 36 32 22 42 16 C48 12 50 18 50 22 C50 18 52 12 58 16 C68 22 60 36 50 46 Z"
        fill="#22c55e"
        {...s}
      />
    ))}
    <circle cx="50" cy="46" r="5" fill="#bbf7d0" {...s} strokeWidth={3} />
  </svg>
);

const HayIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="10" y="26" width="80" height="52" rx="12" fill="#fbbf24" {...s} />
    <path d="M10 44 H90 M10 60 H90" stroke="#b45309" strokeWidth="4" />
    <path d="M30 26 V78 M70 26 V78" stroke="#7c2d12" strokeWidth="6" />
    <path d="M18 34 l6 -4 M40 70 l5 -5 M80 36 l-4 -4 M56 50 l6 -3" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="46" r="36" fill="#ecfccb" {...s} />
    <circle cx="38" cy="36" r="8" fill="#d9f99d" stroke="#a3e635" strokeWidth="3" />
    <circle cx="62" cy="54" r="11" fill="#d9f99d" stroke="#a3e635" strokeWidth="3" />
    <circle cx="44" cy="62" r="5" fill="#d9f99d" stroke="#a3e635" strokeWidth="3" />
    <rect x="18" y="80" width="64" height="17" rx="5" fill="#c084fc" {...s} />
    <text x="50" y="93" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0b0b0e" fontFamily="var(--font-display), sans-serif">
      BONUS
    </text>
  </svg>
);

export const SYMBOLS: Record<Sym, () => ReactElement> = {
  cow: CowIcon,
  bell: BellIcon,
  milk: MilkIcon,
  candle: CandleIcon,
  clover: CloverIcon,
  hay: HayIcon,
  moon: MoonIcon,
};

export const SYMBOL_NAMES: Record<Sym, string> = {
  cow: "Wild cow",
  bell: "Gold bell",
  milk: "Milk",
  candle: "Green candle",
  clover: "Clover",
  hay: "Hay",
  moon: "Moon bonus",
};
