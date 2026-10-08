"use client";

// The hero cow: follows the cursor, blinks, and moos (and waves, and drops SOL) when tapped.
// Taps are counted and sent to the herd's global moo counter in small batches.
import { useCallback, useEffect, useRef, useState } from "react";

import { Cow, type Expression } from "./cow";
import { SoundIcon } from "./icons";
import { isMuted, moo, setMuted } from "./sound";

const LINES = ["MOO!", "moo.", "MOOOO", "gm", "hold me", "milk o'clock", "wagmi", "bullish on grass", "not udder-vice", "◎ ◎ ◎", "MOO MOO", "drink up"];

let pendingMoos = 0;
let flushTimer: number | undefined;

function queueMoo(onCount: (n: number) => void) {
  pendingMoos += 1;
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(async () => {
    const n = pendingMoos;
    pendingMoos = 0;
    try {
      const res = await fetch("/api/moo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ n }) });
      const json = (await res.json()) as { moos?: number | null };
      if (typeof json.moos === "number") onCount(json.moos);
    } catch {
      // offline: the local count still went up
    }
  }, 1200);
}

export function TapCow() {
  const ref = useRef<HTMLButtonElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [expr, setExpr] = useState<Expression>("happy");
  const [waving, setWaving] = useState(false);
  const [bounce, setBounce] = useState(0);
  const [line, setLine] = useState<{ text: string; key: number } | null>(null);
  const [drops, setDrops] = useState<{ key: number; dx: number; dy: number; rot: number }[]>([]);
  const [muted, setMutedState] = useState(false);
  const busy = useRef(false);

  useEffect(() => setMutedState(isMuted()), []);

  // eyes follow the pointer
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.32;
        const dx = (e.clientX - cx) / (window.innerWidth / 2);
        const dy = (e.clientY - cy) / (window.innerHeight / 2);
        setLook({ x: Math.max(-1, Math.min(1, dx * 1.6)), y: Math.max(-1, Math.min(1, dy * 1.6)) });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // idle blinking
  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!busy.current) {
          setExpr("blink");
          window.setTimeout(() => !busy.current && setExpr("happy"), 140);
        }
        loop();
      }, 2400 + Math.random() * 3200);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  const tap = useCallback(() => {
    busy.current = true;
    moo(0.85 + Math.random() * 0.35);
    setExpr(Math.random() < 0.5 ? "joy" : "wow");
    setWaving(true);
    setBounce((b) => b + 1);
    setLine({ text: LINES[Math.floor(Math.random() * LINES.length)], key: Date.now() });
    const burst = Array.from({ length: 5 }, (_, i) => ({
      key: Date.now() + i,
      dx: Math.round((Math.random() - 0.5) * 320),
      dy: Math.round(-120 - Math.random() * 160),
      rot: Math.round((Math.random() - 0.5) * 300),
    }));
    setDrops((d) => [...d.slice(-15), ...burst]);
    window.setTimeout(() => setDrops((d) => d.filter((x) => !burst.some((b) => b.key === x.key))), 1100);
    window.setTimeout(() => {
      busy.current = false;
      setExpr("happy");
      setWaving(false);
    }, 1300);
    queueMoo((n) => window.dispatchEvent(new CustomEvent("cashcow:moos", { detail: n })));
    window.dispatchEvent(new CustomEvent("cashcow:moo"));
  }, []);

  return (
    <div className="tapcow-wrap" style={{ position: "relative", width: "100%", display: "grid", placeItems: "center" }}>
      <button ref={ref} type="button" className="tapcow" onClick={tap} aria-label="Tap the cow to moo">
        <span key={bounce} className={bounce ? "tapcow__body tapcow__body--bounce" : "tapcow__body"}>
          <Cow className="tapcow__svg" expression={expr} wave={waving} look={look} title="Cash Cow, the mascot" />
        </span>
        <span className="tapcow__shadow" aria-hidden="true" />
        {line ? (
          <span className="bubble" key={line.key}>
            {line.text}
          </span>
        ) : null}
        {drops.map((d) => (
          <span key={d.key} className="drop" style={{ ["--dx" as string]: `${d.dx}px`, ["--dy" as string]: `${d.dy}px`, ["--rot" as string]: `${d.rot}deg` }} aria-hidden="true">
            ◎
          </span>
        ))}
      </button>
      <span className="tapcow__hint" aria-hidden="true">
        Tap the cow
        <svg viewBox="0 0 64 40" fill="none" stroke="#0b0b0e" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 30 C20 34 40 30 56 12" />
          <path d="M46 12 L57 11 L54 22" />
        </svg>
      </span>
      <button
        type="button"
        className="mute"
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
        aria-pressed={!muted}
      >
        <SoundIcon on={!muted} width={14} height={14} />
        {muted ? "Sound off" : "Sound on"}
      </button>
    </div>
  );
}
