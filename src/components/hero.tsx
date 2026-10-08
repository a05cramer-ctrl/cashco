import { BRAND, buyUrl, sharePct } from "@/brand";
import { MILKING_MS } from "@/lib/config";

import { EarTag } from "./ear-tag";
import { ArrowIcon, TelegramIcon, XIcon } from "./icons";
import { TapCow } from "./tap-cow";

export function Hero() {
  const minutes = Math.round(MILKING_MS / 60_000);
  return (
    <section className="hero" id="top">
      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="chip">
            <span className={BRAND.mint ? "live-dot" : "live-dot live-dot--off"} aria-hidden="true" />
            <span className="chip__ticker">${BRAND.ticker}</span>
            {BRAND.mint ? "Live on pump.fun" : "Launching on pump.fun"}
          </span>
          <h1 className="h-display hero__title">
            The cow that pays you to <mark>hold</mark> it.
          </h1>
          <p className="hero__sub">
            Every {minutes} minutes the herd gets milked: <b>{sharePct()} of ${BRAND.ticker}&apos;s pump.fun creator fees</b> are claimed and
            poured straight into holders&apos; wallets, in SOL. Hold the cow. Drink the milk.
          </p>
          <div className="hero__ctas">
            <a className="btn btn--mint" href={buyUrl()} target="_blank" rel="noreferrer">
              Buy ${BRAND.ticker} <ArrowIcon />
            </a>
            <a className="btn" href="#milk">
              See the milk
            </a>
            {BRAND.xUrl ? (
              <a className="btn btn--icon" href={BRAND.xUrl} target="_blank" rel="noreferrer" aria-label={`${BRAND.name} on X`} title="Follow on X">
                <XIcon />
              </a>
            ) : null}
            {BRAND.telegramUrl ? (
              <a className="btn btn--icon" href={BRAND.telegramUrl} target="_blank" rel="noreferrer" aria-label={`${BRAND.name} on Telegram`} title="Join the Telegram">
                <TelegramIcon />
              </a>
            ) : null}
          </div>
          <EarTag />
        </div>
        <div className="hero__stage">
          <span className="hero__sun" aria-hidden="true" />
          <Cloud className="hero__cloud" />
          <TapCow />
        </div>
      </div>
      <div className="hero__word" aria-hidden="true">
        <GiantWord text={BRAND.wordmark} />
      </div>
      <div className="grass" aria-hidden="true" />
    </section>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 70" aria-hidden="true">
      <path
        d="M24 60 C8 60 4 44 16 38 C12 22 32 14 42 24 C46 8 72 4 80 20 C90 8 112 12 112 28 C130 26 140 44 128 56 C124 60 118 60 112 60 Z"
        fill="#ffffff"
        stroke="#0b0b0e"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The giant cow-print letters under the hero. */
export function GiantWord({ text }: { text: string }) {
  return (
    <svg className="giant" viewBox="0 0 1400 290" role="presentation">
      <defs>
        <pattern id="cowprint" width="240" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="240" height="170" fill="#fffdf6" />
          <path d="M18 34 C42 10 92 22 86 56 C80 86 38 90 24 70 C12 56 6 46 18 34 Z" fill="#86efac" stroke="#0b0b0e" strokeWidth="5" />
          <path d="M140 96 C162 80 204 92 198 122 C192 150 154 152 142 134 C132 120 128 106 140 96 Z" fill="#86efac" stroke="#0b0b0e" strokeWidth="5" />
          <ellipse cx="176" cy="32" rx="20" ry="13" fill="#86efac" stroke="#0b0b0e" strokeWidth="5" />
          <ellipse cx="62" cy="136" rx="14" ry="10" fill="#86efac" stroke="#0b0b0e" strokeWidth="5" />
        </pattern>
      </defs>
      <text x="710" y="252" textAnchor="middle" fontSize="292" fill="#0b0b0e" textLength="1340" lengthAdjust="spacingAndGlyphs">
        {text}
      </text>
      <text
        x="700"
        y="242"
        textAnchor="middle"
        fontSize="292"
        fill="url(#cowprint)"
        stroke="#0b0b0e"
        strokeWidth="9"
        strokeLinejoin="round"
        paintOrder="stroke fill"
        textLength="1340"
        lengthAdjust="spacingAndGlyphs"
      >
        {text}
      </text>
    </svg>
  );
}
