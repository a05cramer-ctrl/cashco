import { BRAND } from "@/brand";

import { Cow } from "./cow";

export function Thesis() {
  return (
    <section className="section thesis" id="thesis">
      <div className="container">
        <header className="section-head reveal">
          <span className="kicker">
            <span className="kicker__dot" aria-hidden="true" /> The thesis
          </span>
          <h2 className="h-display h2">
            Before money had a ticker, it had <mark>horns</mark>.
          </h2>
        </header>

        <div className="etym reveal">
          <span className="etym__word">PECUNIA</span>
          <p className="etym__note">
            Latin for money, from <em>pecus</em>: cattle. The same root gave English <em>pecuniary</em> and <em>peculiar</em> (from peculium, private
            property, once counted in livestock).
          </p>
        </div>

        <div className="cards3">
          <article className="card fact reveal">
            <span className="fact__tag">c. 2600 BC</span>
            <h3>Egypt counted cows to count time.</h3>
            <p>Old Kingdom scribes named years after the royal cattle count: “the year of the 17th occasion of the count.” The herd was the calendar and the tax base.</p>
          </article>
          <article className="card fact reveal">
            <span className="fact__tag">Rigveda</span>
            <h3>The word for war meant “wanting more cows.”</h3>
            <p>In Vedic Sanskrit, gaviṣṭi, the desire for cows, is a word for battle. People have fought over this asset for a very long time.</p>
          </article>
          <article className="card fact reveal">
            <span className="fact__tag">Rome · 5th c. BC</span>
            <h3>Fines were paid in sheep and oxen.</h3>
            <p>Early Roman law capped fines in livestock, then gave each animal a bronze price. Money learned to count by counting cows.</p>
          </article>
        </div>

        <div className="thesis__row">
          <article className="card receipt reveal">
            <span className="receipt__stamp">Repriced</span>
            <div className="receipt__head">
              <span>Price notice</span>
              <span>Rome · 5th c. BC</span>
            </div>
            <div className="receipt__grid">
              <div>
                <span>Asset</span>
                <b>1 ox</b>
              </div>
              <div>
                <span>Quoted in bronze</span>
                <b>100 asses</b>
              </div>
              <div>
                <span>Asset</span>
                <b>1 sheep</b>
              </div>
              <div>
                <span>Quoted in bronze</span>
                <b>10 asses</b>
              </div>
            </div>
            <div className="receipt__total">
              <span>Exchange rate</span>
              <b>1 ox = 10 sheep</b>
            </div>
            <p className="receipt__foot">Ten asses a sheep, a hundred an ox: an early price oracle, and the cow was the unit.</p>
          </article>

          <article className="card dividend reveal">
            <div>
              <span className="dividend__title">Holder rewards · since the Neolithic</span>
              <dl>
                <div>
                  <dt>Milk</dt>
                  <dd>Every morning</dd>
                </div>
                <div>
                  <dt>A calf</dt>
                  <dd>Every year</dd>
                </div>
                <div>
                  <dt>${BRAND.ticker}</dt>
                  <dd>SOL every 5 min</dd>
                </div>
              </dl>
              <p className="dividend__punch">Every cow gives milk. This one gives SOL.</p>
            </div>
            <Cow className="dividend__cow" accessory="shades" expression="smug" />
          </article>
        </div>
      </div>
    </section>
  );
}
