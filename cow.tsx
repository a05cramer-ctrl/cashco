// The Cash Cow mascot, drawn in SVG so it can blink, follow the cursor, wave and wear things.
// Pure markup (no hooks besides useId), so server and client components can both use it.
import { useId } from "react";

export type Expression = "happy" | "blink" | "joy" | "wow" | "smug" | "wink";
export type Accessory = "none" | "shades" | "party";

export interface CowProps {
  expression?: Expression;
  accessory?: Accessory;
  /** Raise the right hoof (animated by CSS while `waving`). */
  wave?: boolean;
  holding?: "none" | "milk";
  /** Where the pupils look, each axis -1..1. */
  look?: { x: number; y: number };
  /** Outline the whole cow in this colour so it reads on dark backgrounds. */
  sticker?: string;
  crop?: "full" | "head";
  className?: string;
  title?: string;
}

const INK = "#0b0b0e";
const CREAM = "#fffdf6";
const MINT = "#86efac";
const PINK = "#ffc2d8";

const HEAD = "M180 70 H220 C272 70 304 102 306 152 C308 196 298 226 282 246 L118 246 C102 226 92 196 94 152 C96 102 128 70 180 70 Z";
const BODY = "M132 286 C108 318 100 370 114 402 C128 432 272 432 286 402 C300 370 292 318 268 286 Z";

export function Cow({ expression = "happy", accessory = "none", wave = false, holding = "none", look, sticker, crop = "full", className, title }: CowProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const lx = Math.max(-1, Math.min(1, look?.x ?? 0)) * 7;
  const ly = Math.max(-1, Math.min(1, look?.y ?? 0)) * 6;
  const viewBox = crop === "head" ? "16 22 368 360" : accessory === "party" ? "0 -40 400 520" : "0 0 400 480";
  const closedL = expression === "blink" || expression === "joy" || expression === "wink";
  const closedR = expression === "blink" || expression === "joy";

  return (
    <svg viewBox={viewBox} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        {sticker ? (
          <filter id={id("st")} x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d" />
            <feFlood floodColor={sticker} />
            <feComposite in2="d" operator="in" result="o" />
            <feMerge>
              <feMergeNode in="o" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
        <clipPath id={id("head")}>
          <path d={HEAD} />
        </clipPath>
        <clipPath id={id("body")}>
          <path d={BODY} />
        </clipPath>
        <clipPath id={id("eyeL")}>
          <ellipse cx="160" cy="150" rx="25" ry="29" />
        </clipPath>
        <clipPath id={id("eyeR")}>
          <ellipse cx="240" cy="150" rx="25" ry="29" />
        </clipPath>
      </defs>
      <g filter={sticker ? `url(#${id("st")})` : undefined} stroke={INK} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
        {/* tail */}
        <g className="cow-tail">
          <path d="M280 392 C318 398 336 372 326 344" fill="none" />
          <path d="M318 352 C304 338 312 318 326 322 C338 312 352 330 340 344 C334 352 324 356 318 352 Z" fill={MINT} />
        </g>
        {/* legs */}
        <path d="M142 396 L142 446 Q142 458 154 458 L170 458 Q182 458 182 446 L182 396 Z" fill={CREAM} />
        <path d="M218 396 L218 446 Q218 458 230 458 L246 458 Q258 458 258 446 L258 396 Z" fill={CREAM} />
        <path d="M142 438 L182 438 L182 446 Q182 458 170 458 L154 458 Q142 458 142 446 Z" fill={INK} />
        <path d="M218 438 L258 438 L258 446 Q258 458 246 458 L230 458 Q218 458 218 446 Z" fill={INK} />
        {/* body */}
        <path d={BODY} fill={CREAM} />
        <g clipPath={`url(#${id("body")})`}>
          <ellipse cx="236" cy="420" rx="90" ry="40" fill="#e3efe5" stroke="none" />
          <path d="M150 330 C170 322 196 336 192 358 C188 378 164 384 150 372 C138 362 136 338 150 330 Z" fill={MINT} />
          <ellipse cx="262" cy="404" rx="24" ry="14" fill={MINT} />
        </g>
        <path d={BODY} fill="none" />
        {/* left arm (viewer's left) */}
        <g className="cow-arm-l">
          <path d="M142 312 C118 322 102 346 102 368 C102 382 126 384 132 370 C136 352 144 338 156 328 Z" fill={CREAM} />
          <path d="M102 362 C102 380 128 384 132 368 L130 360 C120 356 110 356 102 362 Z" fill={INK} />
        </g>
        {holding === "milk" ? (
          <g className="cow-milk">
            <path d="M70 336 h28 v10 c10 6 14 14 14 26 v26 c0 8 -6 12 -12 12 h-32 c-6 0 -12 -4 -12 -12 v-26 c0 -12 4 -20 14 -26 Z" fill="#ffffff" />
            <path d="M70 330 h28 v9 h-28 Z" fill={MINT} />
            <path d="M58 380 h54" fill="none" strokeWidth="5" stroke={MINT} />
          </g>
        ) : null}
        {/* right arm (viewer's right): waves */}
        <g className={wave ? "cow-arm-r cow-arm-r--wave" : "cow-arm-r"}>
          <path d="M258 312 C282 322 298 346 298 368 C298 382 274 384 268 370 C264 352 256 338 244 328 Z" fill={CREAM} />
          <path d="M298 362 C298 380 272 384 268 368 L270 360 C280 356 290 356 298 362 Z" fill={INK} />
        </g>
        {/* collar + bell */}
        <path d="M124 294 Q200 324 276 294 L278 310 Q200 342 122 310 Z" fill="#22c55e" />
        <g className="cow-bell">
          <path d="M200 316 C186 316 182 326 182 336 L176 352 Q200 362 224 352 L218 336 C218 326 214 316 200 316 Z" fill="#facc15" />
          <circle cx="200" cy="356" r="6" fill={INK} />
        </g>
        {/* horns */}
        <path d="M136 88 C118 76 108 58 110 38 C124 52 142 62 160 72 Z" fill="#fde68a" />
        <path d="M264 88 C282 76 292 58 290 38 C276 52 258 62 240 72 Z" fill="#fde68a" />
        {/* ears */}
        <g className="cow-ear-l">
          <path d="M110 108 C80 94 46 100 30 122 C50 140 84 142 112 134 Z" fill={CREAM} />
          <path d="M100 114 C82 108 60 112 50 122 C64 132 86 132 102 128 Z" fill="#ffb8d2" stroke="none" />
        </g>
        <g className="cow-ear-r">
          <path d="M290 108 C320 94 354 100 370 122 C350 140 316 142 288 134 Z" fill={CREAM} />
          <path d="M300 114 C318 108 340 112 350 122 C336 132 314 132 298 128 Z" fill="#ffb8d2" stroke="none" />
        </g>
        {/* head */}
        <path d={HEAD} fill={CREAM} />
        <g clipPath={`url(#${id("head")})`}>
          <path d="M236 84 C264 72 306 86 310 118 C314 150 288 166 264 158 C242 152 224 130 228 110 C230 98 230 90 236 84 Z" fill={MINT} />
          <path d="M90 126 C114 118 132 138 128 160 C124 180 102 186 90 174 Z" fill={MINT} />
          <ellipse cx="150" cy="92" rx="15" ry="10" fill={MINT} />
        </g>
        <path d={HEAD} fill="none" />
        {/* forelock */}
        <path d="M170 82 C164 64 180 54 194 60 C198 44 224 44 228 60 C242 54 254 70 242 84 C220 92 190 92 170 82 Z" fill={MINT} />
        {/* party hat */}
        {accessory === "party" ? (
          <g>
            <path d="M200 -30 L232 66 Q200 76 168 66 Z" fill="#f472b6" />
            <path d="M188 6 L212 6 M181 30 L219 30 M174 52 L226 52" stroke="#fde68a" strokeWidth="6" />
            <circle cx="200" cy="-32" r="11" fill={MINT} />
          </g>
        ) : null}
        {/* eyes */}
        <Eye cx={160} closed={closedL} expression={expression} lx={lx} ly={ly} clip={`url(#${id("eyeL")})`} side="l" />
        <Eye cx={240} closed={closedR} expression={expression} lx={lx} ly={ly} clip={`url(#${id("eyeR")})`} side="r" />
        {/* brows */}
        {expression === "smug" ? (
          <>
            <path d="M138 104 Q156 92 176 102" fill="none" />
            <path d="M224 114 Q244 110 262 114" fill="none" />
          </>
        ) : expression === "wow" ? (
          <>
            <path d="M138 100 Q156 90 176 98" fill="none" />
            <path d="M224 98 Q244 90 262 100" fill="none" />
          </>
        ) : (
          <>
            <path d="M138 112 Q156 104 176 110" fill="none" />
            <path d="M224 110 Q244 104 262 112" fill="none" />
          </>
        )}
        {accessory === "shades" ? <Shades /> : null}
        {/* cheeks */}
        <ellipse cx="128" cy="200" rx="15" ry="9" fill="#ff9fc4" stroke="none" opacity=".7" />
        <ellipse cx="272" cy="200" rx="15" ry="9" fill="#ff9fc4" stroke="none" opacity=".7" />
        {/* muzzle */}
        <ellipse cx="200" cy="244" rx="98" ry="60" fill={PINK} />
        <ellipse cx="232" cy="226" rx="22" ry="9" fill="#ffffff" stroke="none" opacity=".55" />
        <ellipse cx="168" cy="236" rx="9" ry="13" transform="rotate(-14 168 236)" fill={INK} stroke="none" />
        <ellipse cx="232" cy="236" rx="9" ry="13" transform="rotate(14 232 236)" fill={INK} stroke="none" />
        <Mouth expression={expression} />
      </g>
    </svg>
  );
}

function Eye({ cx, closed, expression, lx, ly, clip, side }: { cx: number; closed: boolean; expression: Expression; lx: number; ly: number; clip: string; side: "l" | "r" }) {
  if (closed) {
    const d =
      expression === "joy"
        ? `M${cx - 22} 158 Q${cx} 132 ${cx + 22} 158`
        : `M${cx - 22} 150 Q${cx} 162 ${cx + 22} 150`;
    return <path d={d} fill="none" />;
  }
  const wow = expression === "wow";
  const smug = expression === "smug";
  const pr = wow ? 9 : 13;
  const px = cx + (side === "l" ? 4 : -4) + lx;
  const py = 156 + ly + (smug ? 6 : 0);
  return (
    <g>
      <ellipse cx={cx} cy={150} rx={25} ry={wow ? 31 : 29} fill="#ffffff" />
      <g clipPath={clip}>
        <circle cx={px} cy={py} r={pr} fill={INK} stroke="none" />
        <circle cx={px + 5} cy={py - 6} r={4.5} fill="#ffffff" stroke="none" />
        {smug ? <rect x={cx - 30} y={116} width={60} height={30} fill="#fffdf6" stroke="none" /> : null}
      </g>
      {smug ? <path d={`M${cx - 24} 146 L${cx + 24} ${side === "l" ? 143 : 149}`} fill="none" /> : null}
      <ellipse cx={cx} cy={150} rx={25} ry={wow ? 31 : 29} fill="none" />
    </g>
  );
}

function Mouth({ expression }: { expression: Expression }) {
  if (expression === "wow") {
    return (
      <g>
        <ellipse cx="200" cy="281" rx="12" ry="14" fill={INK} />
        <ellipse cx="200" cy="288" rx="7" ry="5" fill="#f472b6" stroke="none" />
      </g>
    );
  }
  if (expression === "joy") {
    return (
      <g>
        <path d="M174 268 Q200 302 226 268 Z" fill={INK} />
        <path d="M188 284 Q200 278 212 284 Q200 294 188 284 Z" fill="#f472b6" stroke="none" />
      </g>
    );
  }
  if (expression === "smug") return <path d="M180 279 Q206 288 226 268" fill="none" strokeWidth="6" />;
  return <path d="M178 274 Q200 290 222 274" fill="none" strokeWidth="6" />;
}

function Shades() {
  return (
    <g>
      <path d="M126 128 H194 V154 Q194 176 170 176 H150 Q126 176 126 154 Z" fill={INK} />
      <path d="M206 128 H274 V154 Q274 176 250 176 H230 Q206 176 206 154 Z" fill={INK} />
      <path d="M194 136 H206" fill="none" />
      <path d="M118 128 H282" fill="none" />
      <path d="M140 138 l12 -6 M146 150 l20 -12 M220 138 l12 -6 M226 150 l20 -12" stroke="#86efac" strokeWidth="4" opacity=".9" />
    </g>
  );
}

/** A small side-view cow for the pasture parade. Legs swing with CSS. */
export function CowSide({ className, spots = 0 }: { className?: string; spots?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const layouts = [
    ["M70 50 C90 40 112 52 108 70 C104 86 82 88 72 78 C62 70 58 56 70 50 Z", "M124 74 C136 68 152 76 150 90 C148 100 132 102 126 94 Z"],
    ["M48 64 C62 54 82 62 80 78 C78 92 60 94 50 86 C42 80 40 70 48 64 Z", "M104 46 C120 40 138 50 134 64 C130 76 112 76 106 68 Z"],
    ["M86 60 C104 52 124 62 122 80 C120 96 98 98 88 88 C78 80 76 66 86 60 Z", "M50 50 C60 44 72 50 70 60 C68 68 56 70 50 64 Z"],
  ][spots % 3];
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`cs-${uid}`}>
          <rect x="36" y="42" width="128" height="64" rx="30" />
        </clipPath>
      </defs>
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M40 60 C22 66 16 84 20 100" fill="none" />
        <path d="M14 104 C8 96 14 88 20 92 C26 86 32 96 26 102 C22 106 16 108 14 104 Z" fill={MINT} />
        <g className="cs-legs-a">
          <path d="M52 92 v32 q0 6 6 6 h6 q6 0 6 -6 v-32 Z" fill={CREAM} />
          <path d="M132 92 v32 q0 6 6 6 h6 q6 0 6 -6 v-32 Z" fill={CREAM} />
        </g>
        <g className="cs-legs-b">
          <path d="M72 92 v32 q0 6 6 6 h6 q6 0 6 -6 v-32 Z" fill={CREAM} />
          <path d="M112 92 v32 q0 6 6 6 h6 q6 0 6 -6 v-32 Z" fill={CREAM} />
        </g>
        <rect x="36" y="42" width="128" height="64" rx="30" fill={CREAM} />
        <g clipPath={`url(#cs-${uid})`}>
          <path d={layouts[0]} fill={MINT} />
          <path d={layouts[1]} fill={MINT} />
        </g>
        <rect x="36" y="42" width="128" height="64" rx="30" fill="none" />
        <ellipse cx="96" cy="108" rx="13" ry="7" fill={PINK} />
        <path d="M150 80 C152 92 160 98 170 96" fill="none" stroke="#22c55e" strokeWidth="7" />
        <path d="M160 36 C150 30 146 20 150 12 C156 20 164 24 172 28 Z" fill="#fde68a" />
        <path d="M150 50 C138 42 124 44 118 52 C128 60 140 60 152 58 Z" fill={CREAM} />
        <path d="M148 34 C170 22 200 34 202 58 C204 76 196 88 180 90 C164 92 150 84 146 68 C144 56 142 42 148 34 Z" fill={CREAM} />
        <path d="M172 30 C184 28 196 36 196 48 C188 50 176 46 172 30 Z" fill={MINT} stroke="none" />
        <ellipse cx="190" cy="76" rx="18" ry="14" fill={PINK} />
        <ellipse cx="196" cy="72" rx="3" ry="4" fill={INK} stroke="none" />
        <circle cx="172" cy="54" r="7" fill="#ffffff" />
        <circle cx="174" cy="55" r="3.5" fill={INK} stroke="none" />
      </g>
    </svg>
  );
}
