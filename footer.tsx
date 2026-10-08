import { BRAND, buyUrl, links } from "@/brand";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <p className="footer__disclaimer">
          ${BRAND.ticker} is a memecoin made for fun. It has no intrinsic value and comes with no promise of profit; prices can go to zero. Milk
          payouts depend on trading volume and are not guaranteed. Nothing on this site is financial advice. {BRAND.name} is an independent
          community project, not affiliated with or endorsed by pump.fun.
        </p>
        <div className="footer__row">
          <span>
            © {year} ${BRAND.ticker} · all cows reserved
          </span>
          <div className="footer__links">
            {BRAND.xUrl ? (
              <a href={BRAND.xUrl} target="_blank" rel="noreferrer">
                X
              </a>
            ) : null}
            {BRAND.telegramUrl ? (
              <a href={BRAND.telegramUrl} target="_blank" rel="noreferrer">
                Telegram
              </a>
            ) : null}
            <a href={buyUrl()} target="_blank" rel="noreferrer">
              pump.fun
            </a>
            {BRAND.mint ? (
              <a href={links.token(BRAND.mint)} target="_blank" rel="noreferrer">
                Solscan
              </a>
            ) : null}
          </div>
          <a className="footer__top" href="#top">
            ↑ Back to the pasture
          </a>
        </div>
      </div>
    </footer>
  );
}
