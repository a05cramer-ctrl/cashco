import { BRAND } from "@/brand";

import { XIcon } from "./icons";
import { Slot } from "./slot/slot";
import { SYMBOLS } from "./slot/symbols";

function Bulbs({ where }: { where: "top" | "bottom" }) {
  return (
    <div className={`bulbs bulbs--${where}`} aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export function Casino() {
  const Cow = SYMBOLS.cow;
  const Moon = SYMBOLS.moon;
  const Candle = SYMBOLS.candle;
  return (
    <section className="section casino" id="casino">
      <Bulbs where="top" />
      <div className="container casino__grid">
        <div className="reveal">
          <span className="kicker" style={{ color: "var(--yellow)" }}>
            The barn casino <span className="chip-soon">Coming soon</span>
          </span>
          <h2 className="h-display h2">
            Next: a casino in the <mark>barn</mark>.
          </h2>
          <p className="lead">
            The herd is building games where ${BRAND.ticker} is the chip. First machine on the floor: <b style={{ color: "var(--mint)" }}>Milk Money</b>, a
            five-reel farm slot with a moon bonus wheel. Take the demo for a spin.
          </p>
          <ul className="feature-list">
            <li>
              <Cow />
              <span>
                <b>Wild cows</b>Stand in for every symbol except the moon. Five in a row pays 500×.
              </span>
            </li>
            <li>
              <Moon />
              <span>
                <b>Three moons</b>Anywhere on the reels: spin the wheel for Mini, Minor, Major or Grand.
              </span>
            </li>
            <li>
              <Candle />
              <span>
                <b>Ten lines</b>Green candles, bells and milk pay left to right on ten lines.
              </span>
            </li>
          </ul>
          {BRAND.xUrl ? (
            <a className="btn btn--mint" href={BRAND.xUrl} target="_blank" rel="noreferrer">
              <XIcon /> Get the opening date
            </a>
          ) : null}
          <p className="fineprint">Free demo. Play credits have no cash value: no deposits, no withdrawals, nothing to win. 18+. Play responsibly.</p>
        </div>
        <div className="reveal">
          <Slot />
        </div>
      </div>
      <Bulbs where="bottom" />
    </section>
  );
}
