// Server-only configuration: the database plus the values set in Vercel's environment variables.
import { BRAND } from "@/brand";

import { type Db, getDb } from "./db.server";
import { PUBLIC_RPC } from "./rpc.server";
import { isPubkey, keypairFromSecret } from "./solana";

export interface AppEnv {
  DB?: Db;
  /** A Solana RPC that allows getProgramAccounts (Helius, Triton, QuickNode...). */
  RPC_URL?: string;
  /** The coin creator's key: pump.fun pays creator fees to this wallet, and it pays the herd. */
  TREASURY_SECRET_KEY?: string;
  COIN_MINT?: string;
  MILKING_ENABLED?: string;
  MILK_SHARE_BPS?: number;
  MIN_HOLD_TOKENS?: number;
  EXCLUDE_WALLETS?: string;
}

export async function dairyEnv(): Promise<AppEnv> {
  const e = process.env;
  return {
    DB: (await getDb()) ?? undefined,
    RPC_URL: e.RPC_URL || undefined,
    TREASURY_SECRET_KEY: e.TREASURY_SECRET_KEY || undefined,
    COIN_MINT: BRAND.mint || undefined,
    MILKING_ENABLED: e.MILKING_ENABLED || undefined,
    MILK_SHARE_BPS: BRAND.milkShareBps,
    MIN_HOLD_TOKENS: Number(e.MIN_HOLD_TOKENS) >= 0 && e.MIN_HOLD_TOKENS ? Number(e.MIN_HOLD_TOKENS) : 100_000,
    EXCLUDE_WALLETS: e.EXCLUDE_WALLETS || undefined,
  };
}

export interface Treasury {
  seed: Uint8Array;
  publicKey: string;
}

export function treasuryFrom(env: AppEnv): Treasury | null {
  if (!env.TREASURY_SECRET_KEY) return null;
  try {
    return keypairFromSecret(env.TREASURY_SECRET_KEY);
  } catch {
    return null;
  }
}

export function mintFrom(env: AppEnv): string | null {
  const m = env.COIN_MINT?.trim();
  return m && isPubkey(m) ? m : null;
}

export const milkingEnabled = (env: AppEnv) => (env.MILKING_ENABLED ?? "").trim().toLowerCase() === "true";

export function excludedFrom(env: AppEnv): Set<string> {
  return new Set(
    (env.EXCLUDE_WALLETS ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => isPubkey(s)),
  );
}

/** The configured RPC, or Solana's public one for read-only market data. */
export const rpcUrlFor = (env: AppEnv, purpose: "market" | "holders") =>
  env.RPC_URL || (purpose === "market" ? PUBLIC_RPC : null);
