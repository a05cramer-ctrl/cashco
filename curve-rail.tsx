"use client";

// A bonding-curve gauge on the right edge: fills as you scroll, a little cow rides the curve,
// and the live pump.fun curve progress sits underneath.
import { useEffect, useState } from "react";

import { Cow } from "./cow";
import { SECTIONS } from "./nav";
import { useDairy } from "./state";

export function CurveRail() {
  const { snapshot } = useDairy();
  const [p, setP] = useState(0);
  const [label, setLabel] = useState("Launch");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    let raf = 0;
    let idle = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      let current = "Launch";
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) current = s.label;
      }
      setLabel(current);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    // the section label only shows while you scroll, so it never sits on top of content
    const onScroll = () => {
      onResize();
      setMoving(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setMoving(false), 1100);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const curve = snapshot?.coin?.curvePct;
  return (
    <aside className={moving ? "rail rail--moving" : "rail"} aria-hidden="true">
      <div className="rail__body">
        <div className="rail__track">
          <div className="rail__fill" style={{ height: `${p * 100}%` }} />
        </div>
        <div className="rail__marker" style={{ bottom: `${p * 100}%` }}>
          <Cow crop="head" sticker="#0b0b0e" />
          <span className="rail__label">
            {Math.round(p * 100)}% · {label}
          </span>
        </div>
      </div>
      <div className="rail__live">{curve != null ? (snapshot?.coin?.bonded ? "BONDED" : `CURVE ${curve.toFixed(0)}%`) : "CURVE –"}</div>
    </aside>
  );
}
