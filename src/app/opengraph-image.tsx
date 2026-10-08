// The social card, rendered at build time from the banner and the pfp.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND, sharePct } from "@/brand";

export const runtime = "nodejs";
export const alt = `${BRAND.name} ($${BRAND.ticker}): ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [bg, pfp] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/og-bg.jpg")),
    readFile(join(process.cwd(), "public/brand/pfp-512.png")),
  ]);
  const headline = BRAND.wordmark;
  const line = BRAND.tagline;
  const chip = `$${BRAND.ticker} · ${sharePct()} of creator fees to holders · every 5 min`;
  const font = await googleFont("Bricolage Grotesque", 800, `${headline}${line}${chip}`);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b0b0e" }}>
        <img src={`data:image/jpeg;base64,${bg.toString("base64")}`} width={1200} height={630} style={{ position: "absolute", inset: 0 }} alt="" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(11,11,14,0) 30%, rgba(11,11,14,0.86) 62%, rgba(11,11,14,0.95) 100%)",
          }}
        />
        <div style={{ position: "absolute", right: 56, top: 70, width: 560, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <img src={`data:image/png;base64,${pfp.toString("base64")}`} width={120} height={120} style={{ borderRadius: 999, border: "5px solid #86efac" }} alt="" />
          <div style={{ marginTop: 22, fontSize: 112, lineHeight: 0.9, color: "#86efac", fontFamily: font ? "Display" : "sans-serif", letterSpacing: -3 }}>
            {headline}
          </div>
          <div style={{ marginTop: 18, fontSize: 40, lineHeight: 1.05, color: "#f4f4f5", fontFamily: font ? "Display" : "sans-serif" }}>{line}</div>
          <div
            style={{
              marginTop: 26,
              padding: "10px 18px",
              borderRadius: 999,
              background: "#86efac",
              color: "#052e16",
              fontSize: 22,
              fontFamily: font ? "Display" : "sans-serif",
            }}
          >
            {chip}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Display", data: font, weight: 800, style: "normal" }] : [] },
  );
}
