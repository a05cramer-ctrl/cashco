import { BRAND, buyUrl } from "@/brand";

import { Cow } from "./cow";
import { EarTag } from "./ear-tag";
import { ArrowIcon, ShieldIcon } from "./icons";

export function HowToBuy() {
  return (
    <section className="section buy-sec" id="buy">
      <div className="container">
        <header className="section-head reveal">
          <span className="kicker">
            <span className="kicker__dot" aria-hidden="true" /> How to buy
          </span>
          <h2 className="h-display h2">
            Get in the <mark>herd</mark>.
          </h2>
          <p className="lead">Four steps, about two minutes. Hold the minimum and you&apos;re counted at the very next herd count.</p>
        </header>
        <div className="buy-grid">
          <div className="card fastlane reveal">
            <span className="fastlane__k">The fast lane</span>
            <h3>Buy on pump.fun.</h3>
            <p>Open the coin on pump.fun, connect a Solana wallet, and buy with SOL. That&apos;s it: no bridging, no forms.</p>
            <a className="btn btn--mint" href={buyUrl()} target="_blank" rel="noreferrer">
              {BRAND.mint ? `Buy $${BRAND.ticker}` : "Open pump.fun"} <ArrowIcon />
            </a>
            <Cow className="fastlane__cow" expression="joy" holding="milk" sticker="#0b0b0e" />
          </div>
          <ol className="steps">
            <li className="card step reveal">
              <span className="step__n">1</span>
              <div>
                <h3>Get a Solana wallet</h3>
                <p>Phantom, Solflare or Backpack, on your phone or as a browser extension.</p>
              </div>
            </li>
            <li className="card step reveal">
              <span className="step__n">2</span>
              <div>
                <h3>Load some SOL</h3>
                <p>Buy SOL in the wallet or send it from an exchange. SOL is the hay: it pays for the coin and the network fee.</p>
              </div>
            </li>
            <li className="card step reveal">
              <span className="step__n">3</span>
              <div>
                <h3>Check the ear tag</h3>
                <p>Only buy the official contract address. Copy it from here:</p>
                <EarTag label={`Official $${BRAND.ticker} contract`} compact />
              </div>
            </li>
            <li className="card step reveal">
              <span className="step__n">4</span>
              <div>
                <h3>Swap for ${BRAND.ticker}</h3>
                <p>On pump.fun while the coin is on the curve, or on Jupiter or any Solana DEX after it graduates. Then hold, and watch the milk land.</p>
              </div>
            </li>
          </ol>
        </div>
        <p className="safety reveal">
          <ShieldIcon /> Try a small buy first. Admins never DM first, and nobody legit will ever ask for your seed phrase.
        </p>
      </div>
    </section>
  );
}
