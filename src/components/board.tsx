"use client";

// A pump.fun-style terminal board. Cells "decode" from random glyphs when the board scrolls in.
import { useEffect, useRef, useState } from "react";

import { BRAND } from "@/brand";

import { Cow } from "./cow";

const ROWS: { asset: string; since: string; pays: string; often: string; us?: boolean; no?: boolean }[] = [
  { asset: "Cattle", since: "c. 8500 BC", pays: "Milk + calves", often: "Daily" },
  { asset: "Gold", since: "Antiquity", pays: "Nothing", often: "Never", no: true },
  { asset: "Bitcoin", since: "2009", pays: "Nothing", often: "Never", no: true },
  { asset: "Most memecoins", since: "2013", pays: "Vibes", often: "Sometimes", no: true },
  { asset: `$${BRAND.ticker}`, since: "2026", pays: "SOL", often: "Every 5 min", us: true },
];

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@◎";

function Decode({ text, go, delay }: { text: string; go: boolean; delay: number }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!go) {
      setOut(text.replace(/[^\s]/g, "·"));
      return;
    }
    let frame = 0;
    const total = 16 + text.length;
    let id = 0;
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        frame++;
        const done = Math.floor((frame / total) * text.length * 1.4);
        setOut(
          text
            .split("")
            .map((c, i) => (c === " " || i < done ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
            .join(""),
        );
        if (frame >= total) {
          window.clearInterval(id);
          setOut(text);
        }
      }, 38);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [go, text, delay]);
  return <>{out}</>;
}

export function Board() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          setGo(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section board-sec">
      <div className="container">
        <header className="section-head reveal">
          <span className="kicker">
            <span className="kicker__dot" aria-hidden="true" /> The board
          </span>
          <h2 className="h-display h2">
            Assets that pay you to <mark>hold</mark> them.
          </h2>
        </header>
        <div className="board-wrap reveal">
          <Cow className="board__cow" expression="wink" crop="head" />
          <div className="board" ref={ref}>
            <div className="board__head">
              <span>Herd terminal · yield board</span>
              <span>
                <b>${BRAND.ticker}</b> · pump.fun
              </span>
            </div>
            <div className="board__scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Since</th>
                    <th>Pays holders</th>
                    <th>How often</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={r.asset} className={r.us ? "board__us" : undefined}>
                      <td>
                        <Decode text={r.asset} go={go} delay={i * 140} />
                      </td>
                      <td>
                        <Decode text={r.since} go={go} delay={i * 140 + 60} />
                      </td>
                      <td className={r.no ? "no" : undefined}>
                        <Decode text={r.pays} go={go} delay={i * 140 + 120} />
                      </td>
                      <td className={r.no ? "no" : undefined}>
                        <Decode text={r.often} go={go} delay={i * 140 + 180} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p className="board__foot reveal">One billion supply, fair launch, milk in SOL. That&apos;s the whole pitch.</p>
      </div>
    </section>
  );
}
