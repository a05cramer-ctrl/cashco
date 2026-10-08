// Everything that names the coin lives here. Rename the cow in one place.
// NEXT_PUBLIC_* values are read at build time, so redeploy after changing them in Vercel.

const env = (v: string | undefined) => (v ?? "").trim();

export const BRAND = {
  name: "Cash Cow",
  ticker: "CASHCOW",
  /** The giant letters in the hero. */
  wordmark: "CASH COW",
  tagline: "The cow that pays you to hold it.",
  description:
    "Cash Cow ($CASHCOW) is a pump.fun memecoin that milks itself: every 5 minutes its creator fees are claimed and poured to holders in SOL.",
  /** The coin's mint (contract address). A NEXT_PUBLIC_COIN_MINT set in Vercel overrides it. */
  mint: env(process.env.NEXT_PUBLIC_COIN_MINT) || "9LveWE5pJyyE76BuKDca8JcKqAjFAw5hZbhCyDYfpump",
  xUrl: env(process.env.NEXT_PUBLIC_X_URL) || "https://x.com/CASHCOW_milk",
  telegramUrl: env(process.env.NEXT_PUBLIC_TELEGRAM_URL),
  /** Share of every creator-fee claim that goes to holders, in basis points (8000 = 80%). */
  milkShareBps: clampBps(Number(env(process.env.NEXT_PUBLIC_MILK_SHARE_BPS)) || 8000),
  /** Launch date shown on the cattle passport. */
  bornOn: env(process.env.NEXT_PUBLIC_LAUNCH_DATE) || "2026-10-08",
} as const;

function clampBps(n: number): number {
  return Math.min(10_000, Math.max(0, Math.round(n)));
}

export const sharePct = () => `${Math.round(BRAND.milkShareBps / 100)}%`;

export const links = {
  pumpCoin: (mint: string) => `https://pump.fun/coin/${mint}`,
  pumpHome: "https://pump.fun",
  dex: (mint: string) => `https://dexscreener.com/solana/${mint}`,
  tx: (sig: string) => `https://solscan.io/tx/${sig}`,
  account: (key: string) => `https://solscan.io/account/${key}`,
  token: (mint: string) => `https://solscan.io/token/${mint}`,
};

/** Where "Buy" goes: the coin page once the CA is set, pump.fun before that. */
export const buyUrl = () => (BRAND.mint ? links.pumpCoin(BRAND.mint) : links.pumpHome);
