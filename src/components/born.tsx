"use client";

import { BRAND, buyUrl, links, sharePct } from "@/brand";
import { MILKING_MS } from "@/lib/config";
import { usd } from "@/lib/format";

import { Cow } from "./cow";
import { ArrowIcon } from "./icons";
import { useDairy } from "./state";

export function Born() {
  const { snapshot } = useDairy();
  const coin = snapshot?.coin ?? null;
  const status = !BRAND.mint ? "Launching soon" : coin?.bonded ? "Graduated to PumpSwap" : "Live on the curve";
  const curve = coin?.bonded ? 100 : (coin?.curvePct ?? null);
  return (
    <section className="section dark born" id="pump">
      <div className="container born__grid">
        <div className="reveal">
          <span className="kicker">
            <span className="live-dot" aria-hidden="true" /> On pump.fun
          </span>
          <h2 className="h-display h2">
            Born on the <mark>curve</mark>.
          </h2>
          <p className="lead">
            Fair launched on pump.fun: no presale, no team bag, every coin bought off the bonding curve. The dev wallet only keeps the
            creator-fee share that isn&apos;t poured to the herd.
          </p>
          <dl className="spec">
            <div>
              <dt>Ticker</dt>
              <dd>${BRAND.ticker}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Solana</dd>
            </div>
            <div>
              <dt>Launchpad</dt>
              <dd>pump.fun</dd>
            </div>
            <div>
              <dt>Creator fees to holders</dt>
              <dd>{sharePct()}</dd>
            </div>
            <div>
              <dt>Milking</dt>
              <dd>Every {Math.round(MILKING_MS / 60_000)} min, in SOL</dd>
            </div>
            <div>
              <dt>Market cap</dt>
              <dd>{usd(coin?.mcapUsd)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd style={{ color: "var(--mint)" }}>{status}</dd>
            </div>
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            <a className="btn btn--mint" href={buyUrl()} target="_blank" rel="noreferrer">
              {BRAND.mint ? "Open on pump.fun" : "pump.fun"} <ArrowIcon />
            </a>
            {BRAND.mint ? (
              <a className="btn" href={links.dex(BRAND.mint)} target="_blank" rel="noreferrer">
                Chart
              </a>
            ) : null}
          </div>
        </div>
        <div className="born__art reveal">
          <figure style={{ margin: 0 }}>
            <div className="frame">
              <img src="/brand/banner.webp" alt="The Cash Cow mascot holding up a bottle of milk on a moonlit green hill beside a barn" width={1600} height={686} loading="lazy" />
            </div>
            <figcaption className="frame__caption">
              <span>Specimen 001</span>
              <span>Bos pumpus</span>
              <span>Pasture: Solana</span>
            </figcaption>
          </figure>
          <CurveCard pct={curve} bonded={Boolean(coin?.bonded)} live={Boolean(BRAND.mint)} />
        </div>
      </div>
    </section>
  );
}

/** The live bonding curve, with the cow riding the fill. */
function CurveCard({ pct, bonded, live }: { pct: number | null; bonded: boolean; live: boolean }) {
  const p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="curvecard">
      <div className="curvecard__top">
        <span>Bonding curve</span>
        <b>{!live ? "0%" : pct == null ? "–" : `${p.toFixed(1)}%`}</b>
      </div>
      <div className="curvecard__track" role="img" aria-label={`Bonding curve ${p.toFixed(1)}% complete`}>
        <div className="curvecard__fill" style={{ width: `${p}%` }} />
        <span className="curvecard__cow" style={{ left: `${p}%` }}>
          <Cow crop="head" sticker="#0b0b0e" />
        </span>
      </div>
      <div className="curvecard__ticks">
        <span>Launch</span>
        <span>PumpSwap</span>
      </div>
      <p>
        {bonded
          ? "Graduated. The liquidity lives on PumpSwap now, the creator fees keep flowing there, and the milking keeps going."
          : "At 100% the coin graduates and its liquidity moves to PumpSwap. Creator fees keep flowing there, so the milking never stops."}
      </p>
    </div>
  );
}
