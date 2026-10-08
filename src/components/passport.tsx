import { BRAND, sharePct } from "@/brand";
import { short } from "@/lib/format";

import { Cow } from "./cow";

export function Passport() {
  const share = sharePct();
  const fields: [string, string][] = [
    ["Ticker", `$${BRAND.ticker}`],
    ["Breed", "Bos pumpus"],
    ["Born", BRAND.bornOn || "At launch"],
    ["Network", "Solana"],
    ["Buy / sell tax", "0% / 0%"],
    ["Mint authority", "Revoked"],
    ["Freeze authority", "None"],
    ["Team allocation", "None"],
    ["Fees to holders", share],
  ];
  const mrz1 = `P<SOL<${BRAND.ticker}<<HOLD<THE<COW<DRINK<THE<MILK`.padEnd(44, "<").slice(0, 44);
  const mrz2 = `${BRAND.ticker}<<1000000000<<0TAX<<${share.replace("%", "PCT")}<FEES<HOLDERS`.padEnd(44, "<").slice(0, 44);

  return (
    <section className="section passport-sec" id="passport">
      <div className="container">
        <header className="section-head reveal">
          <span className="kicker">
            <span className="kicker__dot" aria-hidden="true" /> Tokenomics
          </span>
          <h2 className="h-display h2">
            One cow. <mark>One billion</mark> pieces.
          </h2>
          <p className="lead">Nothing hidden in the barn: the pump.fun standard, plus milk.</p>
        </header>

        <div className="passport-wrap">
          <article className="card passport reveal" aria-label="Cattle passport">
            <div className="passport__band">
              <span>Cattle passport · herd registry</span>
              <span>No. {BRAND.ticker}-001</span>
            </div>
            <div className="passport__body">
              <div className="passport__photo">
                <Cow crop="head" expression="smug" />
              </div>
              <div>
                <h3 className="passport__name">{BRAND.name}</h3>
                <div className="passport__supply">
                  <b>1,000,000,000</b>
                  <span>${BRAND.ticker} · total supply · fixed</span>
                </div>
                <div className="passport__fields">
                  {fields.map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
                <p style={{ margin: "14px 0 0", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <b>Ear tag (CA):</b> {BRAND.mint ? short(BRAND.mint, 8) : "issued at launch"}
                </p>
              </div>
            </div>
            <div className="mrz" aria-hidden="true">
              {mrz1}
              <br />
              {mrz2}
            </div>
            <div className="stamp" aria-hidden="true">
              Fair
              <br />
              launch
              <br />
              certified
            </div>
          </article>

          <div className="notes">
            <article className="card note reveal">
              <h3>The supply can&apos;t grow</h3>
              <p>pump.fun coins launch with mint and freeze authority switched off. One billion, forever.</p>
            </article>
            <article className="card note reveal">
              <h3>Liquidity graduates</h3>
              <p>When the bonding curve fills, pump.fun moves the liquidity to PumpSwap. Milking keeps going after graduation.</p>
            </article>
            <article className="card note reveal">
              <h3>Where the fees go</h3>
              <p>
                {share} of every creator-fee claim is poured to holders. The rest feeds the barn: marketing, the casino and the treasury&apos;s gas.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
