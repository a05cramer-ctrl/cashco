"use client";

import { useEffect, useState } from "react";

import { BRAND, buyUrl } from "@/brand";

import { CloseIcon, MenuIcon, TelegramIcon, XIcon } from "./icons";

export const SECTIONS = [
  { id: "milk", label: "Milk", badge: "live" },
  { id: "casino", label: "Casino", badge: "soon" },
  { id: "thesis", label: "Thesis" },
  { id: "pump", label: "On pump.fun" },
  { id: "passport", label: "Tokenomics" },
  { id: "buy", label: "How to buy" },
  { id: "herd", label: "Herd" },
] as const;

export function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((x): x is HTMLElement => Boolean(x));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const onTop = () => {
      if (window.scrollY < 200) setActive(null);
    };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="nav">
      <div className="nav__bar">
        <a className="nav__brand" href="#top" aria-label={`${BRAND.name} home`}>
          <img src="/brand/pfp-128.webp" alt="" width={38} height={38} />
          <span>${BRAND.ticker}</span>
        </a>
        <nav className="nav__links" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
              {s.label}
              {"badge" in s && s.badge === "soon" ? <span className="chip-soon">soon</span> : null}
              {"badge" in s && s.badge === "live" ? <span className="live-dot" aria-hidden="true" /> : null}
            </a>
          ))}
        </nav>
        <div className="nav__actions">
          {BRAND.xUrl ? (
            <a className="icon-btn icon-btn--social" href={BRAND.xUrl} target="_blank" rel="noreferrer" aria-label="Follow on X">
              <XIcon />
            </a>
          ) : null}
          {BRAND.telegramUrl ? (
            <a className="icon-btn icon-btn--social" href={BRAND.telegramUrl} target="_blank" rel="noreferrer" aria-label="Join the Telegram">
              <TelegramIcon />
            </a>
          ) : null}
          <a className="btn btn--mint btn--sm" href={buyUrl()} target="_blank" rel="noreferrer">
            Buy ${BRAND.ticker}
          </a>
          <button className="icon-btn nav__menu" type="button" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="nav__sheet" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setOpen(false)}>
              {s.label}
              {"badge" in s && s.badge === "soon" ? <span className="chip-soon">soon</span> : null}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
