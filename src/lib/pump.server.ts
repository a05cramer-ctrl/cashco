// pump.fun, PumpPortal and DexScreener integrations (server only).
import { LAMPORTS_PER_SOL, PROGRAMS, PUMP_CURVE_TOKENS, PUMP_DECIMALS, WSOL_MINT } from "./config";
import type { Rpc, RpcAccount } from "./rpc.server";
import type { Market } from "./types";
import {
  ammCreatorVaultAuthority,
  associatedTokenAddress,
  b58encode,
  bondingCurveAddress,
  fromBase64,
  pumpCreatorVault,
} from "./solana";

const PUMPPORTAL_LOCAL = "https://pumpportal.fun/api/trade-local";
const decoder = new TextDecoder();

export interface CurveState {
  complete: boolean;
  creator: string | null;
  mcapSol: number;
  /** 0..1 share of the curve's tokens already sold (pump.fun's "bonding curve progress"). */
  progress: number;
}

/**
 * pump.fun BondingCurve account: 8-byte discriminator, then u64 virtual token reserves (8),
 * virtual SOL reserves (16), real token reserves (24), real SOL reserves (32), token supply (40),
 * the `complete` flag (48) and the creator (49..81).
 */
export function parseBondingCurve(data: Uint8Array): CurveState | null {
  if (data.length < 49) return null;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const virtualTokens = dv.getBigUint64(8, true);
  const virtualSol = dv.getBigUint64(16, true);
  const realTokens = dv.getBigUint64(24, true);
  const supply = dv.getBigUint64(40, true);
  const complete = data[48] === 1;
  const creator = data.length >= 81 ? b58encode(data.subarray(49, 81)) : null;
  const mcapSol =
    virtualTokens > 0n ? (Number(virtualSol) / LAMPORTS_PER_SOL) * (Number(supply) / Number(virtualTokens)) : 0;
  const onCurve = PUMP_CURVE_TOKENS * 10 ** PUMP_DECIMALS;
  const progress = complete ? 1 : Math.min(1, Math.max(0, 1 - Number(realTokens) / onCurve));
  return { complete, creator, mcapSol, progress };
}

export function curveFromAccount(acc: RpcAccount | null | undefined): CurveState | null {
  if (!acc || acc.owner !== PROGRAMS.pump) return null;
  return parseBondingCurve(fromBase64(acc.data[0]));
}

export interface MintInfo {
  tokenProgram: string;
  decimals: number;
}

/** SPL or Token-2022 mint: `decimals` is the byte at offset 44 in both layouts. */
export function mintInfoFromAccount(acc: RpcAccount | null | undefined): MintInfo | null {
  if (!acc || (acc.owner !== PROGRAMS.token && acc.owner !== PROGRAMS.token2022)) return null;
  const data = fromBase64(acc.data[0]);
  if (data.length < 82) return null;
  return { tokenProgram: acc.owner, decimals: data[44] };
}

async function pumpPortal(body: Record<string, unknown>): Promise<Uint8Array> {
  const res = await fetch(PUMPPORTAL_LOCAL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (res.status !== 200) throw new Error(`PumpPortal ${res.status}: ${decoder.decode(buf).slice(0, 160)}`);
  return buf;
}

/** Claims every pump.fun creator fee owed to `creator` in one transaction (PumpPortal local API). */
export function buildClaimTransaction(creator: string): Promise<Uint8Array> {
  return pumpPortal({ publicKey: creator, action: "collectCreatorFee", priorityFee: 0.00001, pool: "pump" });
}

/** Creator fees waiting to be claimed: the pump creator vault plus WSOL in the PumpSwap creator vault. */
export async function claimableLamports(rpc: Rpc, creator: string): Promise<number> {
  const [vault] = await rpc.getMultipleAccounts([pumpCreatorVault(creator)]);
  const onCurve = vault ? Math.max(0, vault.lamports - 890_880) : 0;
  const onAmm = await rpc.getTokenBalance(associatedTokenAddress(ammCreatorVaultAuthority(creator), WSOL_MINT));
  return onCurve + onAmm;
}

interface DexPair {
  baseToken: { address: string };
  quoteToken: { address: string; symbol?: string };
  priceNative?: string;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
}

async function dexPairs(addresses: string[]): Promise<DexPair[]> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addresses.join(",")}`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as DexPair[]) : [];
  } catch {
    return [];
  }
}

/** Market cap in SOL for a coin that has left the curve (PumpSwap), from its deepest pair. */
export async function dexMcapSol(mint: string, solUsd: number | null): Promise<number | null> {
  let best: { liq: number; mcap: number } | null = null;
  for (const p of await dexPairs([mint])) {
    if (p.baseToken.address !== mint) continue;
    const liq = p.liquidity?.usd ?? 0;
    let mcap = 0;
    if (p.quoteToken.address === WSOL_MINT && p.priceNative) mcap = parseFloat(p.priceNative) * 1e9;
    else if (solUsd && (p.marketCap ?? p.fdv)) mcap = (p.marketCap ?? p.fdv ?? 0) / solUsd;
    if (!Number.isFinite(mcap) || mcap <= 0) continue;
    if (!best || liq > best.liq) best = { liq, mcap };
  }
  return best?.mcap ?? null;
}

export async function fetchSolUsd(): Promise<number | null> {
  const pairs = (await dexPairs([WSOL_MINT]))
    .filter((p) => p.baseToken.address === WSOL_MINT && ["USDC", "USDT"].includes(p.quoteToken.symbol ?? ""))
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const price = parseFloat(pairs[0]?.priceUsd ?? "");
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** Live market data for the coin: the bonding curve while it is on pump.fun, DexScreener after. */
export async function readMarket(rpc: Rpc, mint: string | null, solUsdHint: number | null, now = Date.now()): Promise<Market> {
  const solUsd = solUsdHint ?? (await fetchSolUsd());
  const empty: Market = { mint, mcapSol: null, mcapUsd: null, curvePct: null, bonded: false, creator: null, solUsd, at: now };
  if (!mint) return empty;
  let curve: CurveState | null = null;
  try {
    curve = curveFromAccount(await rpc.getAccount(bondingCurveAddress(mint)));
  } catch {
    // RPC hiccup: fall through to DexScreener
  }
  let mcapSol = curve && !curve.complete ? curve.mcapSol : null;
  const bonded = curve?.complete ?? false;
  if (mcapSol === null) mcapSol = await dexMcapSol(mint, solUsd);
  return {
    mint,
    mcapSol,
    mcapUsd: mcapSol !== null && solUsd ? mcapSol * solUsd : null,
    curvePct: curve ? Math.round(curve.progress * 1000) / 10 : bonded ? 100 : null,
    bonded,
    creator: curve?.creator ?? null,
    solUsd,
    at: now,
  };
}
