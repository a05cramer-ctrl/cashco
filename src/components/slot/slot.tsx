"use client";

// Milk Money, the demo slot. Reels are plain DOM strips moved with CSS transforms.
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SoundIcon } from "../icons";
import { blip, isMuted, jingle, setMuted } from "../sound";
import { BETS, evaluate, LINES, pick, REELS, ROWS, spinGrid, spinWheel, START_CREDITS, WHEEL, type LineWin } from "./engine";
import { SYMBOLS, type Sym } from "./symbols";

type Overlay = { kind: "big"; amount: number } | { kind: "wheel"; target: number; spun: boolean; total: number } | null;

const loadCredits = () => {
  try {
    const v = Number(window.localStorage.getItem("cashcow:credits"));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : START_CREDITS;
  } catch {
    return START_CREDITS;
  }
};

const saveCredits = (v: number) => {
  try {
    window.localStorage.setItem("cashcow:credits", String(v));
  } catch {
    // storage blocked: credits reset on reload
  }
};

const INITIAL: Sym[][] = [
  ["hay", "cow", "clover"],
  ["milk", "cow", "bell"],
  ["clover", "cow", "candle"],
  ["bell", "milk", "hay"],
  ["candle", "moon", "milk"],
];

export function Slot() {
  const [credits, setCredits] = useState(START_CREDITS);
  const [betIdx, setBetIdx] = useState(2);
  const [strips, setStrips] = useState<Sym[][]>(INITIAL);
  const [spinning, setSpinning] = useState(false);
  const [wins, setWins] = useState<LineWin[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [msg, setMsg] = useState("Free demo credits · nothing to win");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [cell, setCell] = useState(84);
  const [auto, setAuto] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const reelsRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<Sym[][]>(INITIAL);
  const creditsRef = useRef(START_CREDITS);
  const bet = BETS[betIdx];

  useEffect(() => {
    const c = loadCredits();
    setCredits(c);
    creditsRef.current = c;
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    const el = reelsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const first = el.querySelector<HTMLElement>(".reel");
      if (first) setCell(Math.round(first.getBoundingClientRect().width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const changeCredits = useCallback((v: number) => {
    creditsRef.current = v;
    setCredits(v);
    saveCredits(v);
  }, []);

  const spin = useCallback(() => {
    if (spinning || overlay) return;
    if (creditsRef.current < bet) {
      setMsg("Bucket's empty · refill to keep playing");
      setAuto(0);
      return;
    }
    changeCredits(creditsRef.current - bet);
    setSpinning(true);
    setWins([]);
    setLastWin(0);
    setMsg("Spinning…");
    blip(330, 0.05);
    const prev = gridRef.current;
    const next = spinGrid();
    const fillers = Array.from({ length: REELS }, (_, i) => 12 + i * 4);
    const built = next.map((col, i) => [...prev[i], ...Array.from({ length: fillers[i] }, () => pick()), ...col]);
    setStrips(built);
    // Let React paint the long strips, then roll them.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        stripRefs.current.forEach((el, i) => {
          if (!el) return;
          const dur = 900 + i * 240;
          el.style.transition = "none";
          el.style.transform = "translateY(0)";
          void el.offsetHeight;
          el.style.transition = `transform ${dur}ms cubic-bezier(0.18, 0.8, 0.28, 1.04)`;
          el.style.transform = `translateY(-${(3 + fillers[i]) * cell}px)`;
          window.setTimeout(() => blip(220 + i * 70, 0.05, "triangle", 0.07), dur - 60);
        });
      }),
    );
    const total = 900 + (REELS - 1) * 240 + 120;
    window.setTimeout(() => {
      gridRef.current = next;
      // Swap in the short strip and reset its offset in the same frame, so nothing flickers.
      flushSync(() => setStrips(next));
      stripRefs.current.forEach((el) => {
        if (!el) return;
        el.style.transition = "none";
        el.style.transform = "translateY(0)";
      });
      const lineBet = bet / 10;
      const result = evaluate(next, lineBet);
      setWins(result.wins);
      setSpinning(false);
      if (result.total > 0) {
        changeCredits(creditsRef.current + result.total);
        setLastWin(result.total);
        setMsg(`Milked ${result.total.toLocaleString("en-US")} credits on ${result.wins.length} line${result.wins.length === 1 ? "" : "s"}`);
        jingle(result.total >= bet * 15);
        if (result.total >= bet * 15) setOverlay({ kind: "big", amount: result.total });
      } else setMsg(result.moons >= 2 ? "Two moons… so close" : "No milk this time");
      if (result.moons >= 3) {
        const target = spinWheel();
        window.setTimeout(() => setOverlay({ kind: "wheel", target, spun: false, total: 0 }), result.total >= bet * 15 ? 2200 : 500);
      }
    }, total);
  }, [bet, cell, changeCredits, overlay, spinning]);

  // auto spin
  useEffect(() => {
    if (!auto || spinning || overlay) return;
    const t = window.setTimeout(() => {
      setAuto((a) => Math.max(0, a - 1));
      spin();
    }, 450);
    return () => window.clearTimeout(t);
  }, [auto, spinning, overlay, spin]);

  // big-win overlay closes itself
  useEffect(() => {
    if (overlay?.kind !== "big") return;
    const t = window.setTimeout(() => setOverlay(null), 2200);
    return () => window.clearTimeout(t);
  }, [overlay]);

  function spinTheWheel() {
    if (overlay?.kind !== "wheel" || overlay.spun) return;
    const seg = 360 / WHEEL.length;
    // the pointer sits at 12 o'clock: land the target segment's centre there
    const land = 360 - (overlay.target * seg + seg / 2);
    const angle = wheelAngle + 360 * 6 + ((land - (wheelAngle % 360) + 360) % 360);
    setWheelAngle(angle);
    const prize = WHEEL[overlay.target];
    const amount = prize.mult * bet;
    setOverlay({ ...overlay, spun: true, total: amount });
    window.setTimeout(() => {
      changeCredits(creditsRef.current + amount);
      setLastWin(amount);
      setMsg(`${prize.label} jackpot · ${amount.toLocaleString("en-US")} credits`);
      jingle(true);
    }, 4300);
    window.setTimeout(() => setOverlay(null), 6500);
  }

  const winningCells = new Set<string>();
  for (const w of wins) for (let r = 0; r < w.count; r++) winningCells.add(`${r}:${LINES[w.line][r]}`);

  return (
    <div className="slot" style={{ ["--cell" as string]: `${cell}px` }}>
      <div className="slot__top">
        <span className="slot__logo">Milk Money</span>
        <span className="slot__tag">Free demo</span>
      </div>
      <div className="jackpots" aria-label="Bonus wheel prizes at this bet">
        {(["mini", "minor", "major", "grand"] as const).map((id) => {
          const prize = WHEEL.find((w) => w.id === id)!;
          return (
            <div key={id} className={`jackpot jackpot--${id}`}>
              <span>{prize.label}</span>
              <b>{(prize.mult * bet).toLocaleString("en-US")}</b>
            </div>
          );
        })}
      </div>
      <div className="reels" ref={reelsRef}>
        {strips.map((col, i) => (
          <div className="reel" key={i}>
            <div className="reel__strip" ref={(el) => void (stripRefs.current[i] = el)}>
              {col.map((sym, j) => {
                const Icon = SYMBOLS[sym];
                const win = !spinning && col.length === ROWS && winningCells.has(`${i}:${j}`);
                return (
                  <div className={win ? "reel__cell reel__cell--win" : "reel__cell"} key={j}>
                    <Icon />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {!spinning && wins.length ? (
          <svg className="reels__lines" viewBox={`0 0 ${REELS * 100} ${ROWS * 100}`} preserveAspectRatio="none" aria-hidden="true">
            {wins.map((w) => (
              <polyline key={w.line} points={LINES[w.line].map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`).join(" ")} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        ) : null}
      </div>
      <div className="slot__msg" role="status">
        {msg}
      </div>
      <div className="slot__bar">
        <div className="meter">
          <span>CREDITS</span>
          <b>{credits.toLocaleString("en-US")}</b>
        </div>
        <div className={lastWin ? "meter meter--win" : "meter"}>
          <span>WIN</span>
          <b>{lastWin.toLocaleString("en-US")}</b>
        </div>
        <div className="bet">
          <button type="button" onClick={() => setBetIdx((b) => Math.max(0, b - 1))} disabled={spinning} aria-label="Lower the bet">
            −
          </button>
          <div className="meter" style={{ minWidth: 76 }}>
            <span>BET</span>
            <b>{bet}</b>
          </div>
          <button type="button" onClick={() => setBetIdx((b) => Math.min(BETS.length - 1, b + 1))} disabled={spinning} aria-label="Raise the bet">
            +
          </button>
        </div>
        {credits < bet && !spinning ? (
          <button className="spin" type="button" onClick={() => changeCredits(START_CREDITS)}>
            Refill
          </button>
        ) : (
          <button className="spin" type="button" onClick={spin} disabled={spinning || Boolean(overlay)}>
            {spinning ? "…" : "Spin"}
          </button>
        )}
      </div>
      <div className="slot__foot">
        <button type="button" onClick={() => setAuto((a) => (a ? 0 : 10))} disabled={credits < bet}>
          {auto ? `Auto · ${auto} left (stop)` : "Auto ×10"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-pressed={!muted}
        >
          <SoundIcon on={!muted} width={14} height={14} /> {muted ? "Sound off" : "Sound on"}
        </button>
        <span>10 lines · 3 moons = bonus wheel</span>
      </div>

      {overlay?.kind === "big" ? (
        <div className="slot__overlay" onClick={() => setOverlay(null)}>
          <div className="bigwin">
            MILKED IT!
            <small>+{overlay.amount.toLocaleString("en-US")} credits</small>
          </div>
        </div>
      ) : null}
      {overlay?.kind === "wheel" ? (
        <div className="slot__overlay">
          <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
            <div className="bigwin" style={{ fontSize: 34 }}>
              {overlay.spun && overlay.total ? `+${overlay.total.toLocaleString("en-US")}` : "3 moons! Spin the wheel"}
            </div>
            <div className="wheel">
              <span className="wheel__pointer" aria-hidden="true" />
              <Wheel angle={wheelAngle} />
            </div>
            {!overlay.spun ? (
              <button className="spin" type="button" onClick={spinTheWheel}>
                Spin it
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Wheel({ angle }: { angle: number }) {
  const n = WHEEL.length;
  const seg = (2 * Math.PI) / n;
  return (
    <svg className="wheel__disc" viewBox="-110 -110 220 220" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
      {WHEEL.map((w, i) => {
        const a0 = i * seg - Math.PI / 2;
        const a1 = a0 + seg;
        const p = (a: number) => `${Math.cos(a) * 100} ${Math.sin(a) * 100}`;
        const mid = a0 + seg / 2;
        return (
          <g key={i}>
            <path d={`M0 0 L${p(a0)} A100 100 0 0 1 ${p(a1)} Z`} fill={w.color} stroke="#0b0b0e" strokeWidth="3" />
            <text
              x={Math.cos(mid) * 64}
              y={Math.sin(mid) * 64}
              transform={`rotate(${(mid * 180) / Math.PI + 90} ${Math.cos(mid) * 64} ${Math.sin(mid) * 64})`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fontWeight="900"
              fill="#0b0b0e"
              fontFamily="var(--font-display), sans-serif"
            >
              {w.label}
            </text>
          </g>
        );
      })}
      <circle r="18" fill="#86efac" stroke="#0b0b0e" strokeWidth="4" />
    </svg>
  );
}
