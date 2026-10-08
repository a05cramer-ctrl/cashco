// Formatting for SOL, market caps, addresses and clocks (browser + server).
const LAMPORTS = 1_000_000_000;

export function sol(lamports: number | null | undefined, digits = 3): string {
  if (lamports == null || !Number.isFinite(lamports)) return "–";
  const v = lamports / LAMPORTS;
  if (v === 0) return "0";
  if (v < 0.001) return "<0.001";
  return v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 1 : digits });
}

export function usd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}K`;
  return `$${v.toFixed(v >= 100 ? 0 : 2)}`;
}

export function tokens(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}K`;
  return v.toFixed(0);
}

export const int = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? "–" : Math.round(v).toLocaleString("en-US"));

export const short = (s: string, n = 4) => (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export function ago(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function clock(msLeft: number): string {
  const t = Math.max(0, Math.ceil(msLeft / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function shareOnX(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
