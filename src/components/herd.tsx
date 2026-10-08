"use client";

import { useEffect, useState } from "react";

import { BRAND, buyUrl } from "@/brand";
import { int } from "@/lib/format";

import { CowSide } from "./cow";
import { ArrowIcon, TelegramIcon, XIcon } from "./icons";
import { moo } from "./sound";
import { useDairy } from "./state";

const WALKERS = [
  { dur: 38, delay: -4, spots: 0, scale: 1 },
  { dur: 46, delay: -18, spots: 1, scale: 0.86 },
  { dur: 41, delay: -27, spots: 2, scale: 1.08 },
  { dur: 52, delay: -36, spots: 1, scale: 0.92 },
  { dur: 44, delay: -9, spots: 2, scale: 0.8 },
];

export function Herd() {
  const { snapshot } = useDairy();
  const [moos, setMoos] = useState<number | null>(null);
  const [local, setLocal] = useState(0);

  useEffect(() => {
    if (snapshot && snapshot.config.db) setMoos((m) => Math.max(m ?? 0, snapshot.moos));
  }, [snapshot]);

  useEffect(() => {
    const onMoos = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === "number") setMoos((m) => Math.max(m ?? 0, n));
    };
    const onMoo = () => setLocal((n) => n + 1);
    window.addEventListener("cashcow:moos", onMoos);
    window.addEventListener("cashcow:moo", onMoo);
    return () => {
      window.removeEventListener("cashcow:moos", onMoos);
      window.removeEventListener("cashcow:moo", onMoo);
    };
  }, []);

  async function mooButton() {
    moo(0.8 + Math.random() * 0.4);
    setLocal((n) => n + 1);
    try {
      const res = await fetch("/api/moo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ n: 1 }) });
      const json = (await res.json()) as { moos?: number | null };
      if (typeof json.moos === "number") setMoos((m) => Math.max(m ?? 0, json.moos as number));
    } catch {
      // offline
    }
  }

  return (
    <section className="herd" id="herd">
      <div className="container herd__head">
        <div className="reveal">
          <span className="kicker">
            <span className="kicker__dot" aria-hidden="true" /> Community
          </span>
          <h2 className="h-display h2">
            Join the <mark>herd</mark>.
          </h2>
          <p className="lead">Memes, milk receipts and the casino opening date. Bring your cow.</p>
          <div className="herd__ctas">
            {BRAND.xUrl ? (
              <a className="btn btn--dark" href={BRAND.xUrl} target="_blank" rel="noreferrer">
                <XIcon /> Follow on X
              </a>
            ) : null}
            {BRAND.telegramUrl ? (
              <a className="btn" href={BRAND.telegramUrl} target="_blank" rel="noreferrer">
                <TelegramIcon /> Join Telegram
              </a>
            ) : null}
            <a className="btn btn--mint" href={buyUrl()} target="_blank" rel="noreferrer">
              Buy ${BRAND.ticker} <ArrowIcon />
            </a>
          </div>
        </div>
        <div className="card moometer reveal">
          <div className="moometer__k">The herd has mooed</div>
          <div className="moometer__n">{moos === null ? int(local) : int(Math.max(moos, local))}</div>
          <div className="moometer__k" style={{ opacity: 0.6 }}>
            times{moos === null ? " (on this device)" : ""}
          </div>
          <button className="btn btn--mint btn--sm" type="button" onClick={() => void mooButton()}>
            Moo
          </button>
        </div>
      </div>
      <div className="pasture" aria-hidden="true">
        <div className="pasture__hill pasture__hill--back" />
        <div className="pasture__hill" />
        <Barn />
        <div className="parade">
          {WALKERS.map((w, i) => (
            <div
              key={i}
              className="walker"
              style={{ ["--dur" as string]: `${w.dur}s`, ["--delay" as string]: `${w.delay}s`, width: 112 * w.scale }}
            >
              <CowSide spots={w.spots} />
            </div>
          ))}
        </div>
      </div>
      <div className="herd__ground" />
    </section>
  );
}

function Barn() {
  return (
    <svg className="pasture__barn" viewBox="0 0 160 150" aria-hidden="true">
      <g stroke="#0b0b0e" strokeWidth="4" strokeLinejoin="round">
        <path d="M14 66 L80 14 L146 66 L146 146 L14 146 Z" fill="#dc2626" />
        <path d="M4 70 L80 8 L156 70 L146 78 L80 26 L14 78 Z" fill="#86efac" />
        <rect x="52" y="86" width="56" height="60" fill="#fbfef9" />
        <path d="M52 86 L108 146 M108 86 L52 146" />
        <rect x="68" y="44" width="24" height="20" fill="#fde68a" />
      </g>
    </svg>
  );
}
