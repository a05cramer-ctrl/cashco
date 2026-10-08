// The dairy's clockwork. Once a minute (runTickIfDue) it:
//   1. reads the coin's market (bonding curve or DexScreener),
//   2. samples every holder's balance (time-weighted: a round has ~5 samples),
//   3. reconciles payouts sent on earlier ticks,
//   4. milks finished rounds: claim the creator fees -> split them across holders -> pour SOL,
//   5. writes the public snapshot that /api/state serves.
// Nothing waits on the chain: claims and payouts are sent on one tick and confirmed on the next.
import {
  DUST_LAMPORTS,
  MAX_PAYOUT_TXS_PER_TICK,
  MILKING_MS,
  MIN_CLAIM_LAMPORTS,
  MIN_PAYOUT_LAMPORTS,
  PAYOUTS_PER_TX,
  PROGRAMS,
  TICK_MS,
  TREASURY_RESERVE_LAMPORTS,
  roundEndMs,
  roundIdAt,
} from "./config";
import type { Db, Stmt } from "./db.server";
import { type AppEnv, type Treasury, excludedFrom, milkingEnabled, mintFrom, rpcUrlFor, treasuryFrom } from "./env.server";
import { errMsg } from "./http.server";
import { buildClaimTransaction, claimableLamports, fetchSolUsd, mintInfoFromAccount, readMarket } from "./pump.server";
import { lamportDelta, Rpc } from "./rpc.server";
import { b58decode, b58encode, buildTransferTransaction, fromBase64, isOnCurve, signTransactionBytes, transactionId } from "./solana";
import type { CupView, DairySnapshot, Market } from "./types";

export interface RoundRow {
  round_id: number;
  samples: number;
  status: string;
  claim_sig: string | null;
  claim_sent_at: number | null;
  claimed_lamports: number;
  pot_lamports: number;
  note: string | null;
}

/** One round's herd: n samples taken, and per wallet [sum of sampled balances, latest balance]. */
export interface Acc {
  n: number;
  w: Record<string, [number, number]>;
}

// ------------------------------------------------------------------ kv helpers
export async function kvGet(db: Db, k: string): Promise<string | null> {
  const row = await db.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first<{ v: string }>();
  return row?.v ?? null;
}

export async function kvJson<T>(db: Db, k: string, fallback: T): Promise<T> {
  const v = await kvGet(db, k);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export const kvSet = (db: Db, k: string, v: string, now = Date.now()): Stmt =>
  db
    .prepare("INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at")
    .bind(k, v, now);

export const kvAdd = (db: Db, k: string, delta: number, now = Date.now()): Stmt =>
  db
    .prepare(
      "INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(v AS INTEGER) + ? AS TEXT), updated_at = excluded.updated_at",
    )
    .bind(k, String(Math.round(delta)), now, Math.round(delta));

async function run(db: Db, stmts: Stmt[]): Promise<void> {
  for (let i = 0; i < stmts.length; i += 90) await db.batch(stmts.slice(i, i + 90));
}

const marks = (n: number) => Array.from({ length: n }, () => "?").join(",");
const round2 = (n: number) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ market + herd
const curveCache = new Map<string, boolean>();
/** Wallets only: program-derived owners (the bonding curve, AMM pools, lockers) are off the ed25519 curve. */
function isWallet(owner: string): boolean {
  let v = curveCache.get(owner);
  if (v === undefined) {
    v = isOnCurve(b58decode(owner));
    if (curveCache.size > 50_000) curveCache.clear();
    curveCache.set(owner, v);
  }
  return v;
}

export interface Herd {
  /** Wallets holding any amount. */
  holders: number;
  /** Wallets that qualify for milk (not excluded, at least the minimum hold), with their balances. */
  eligible: Map<string, number>;
}

export async function fetchHerd(rpc: Rpc, mint: string, exclude: Set<string>, minHold: number): Promise<Herd> {
  const [mintAcc] = await rpc.getMultipleAccounts([mint]);
  const info = mintInfoFromAccount(mintAcc);
  if (!info) throw new Error("the coin's mint account was not found");
  const accounts = await rpc.getTokenHolders(info.tokenProgram, mint, info.tokenProgram === PROGRAMS.token);
  const scale = 10 ** info.decimals;
  const byOwner = new Map<string, number>();
  for (const a of accounts) {
    const d = fromBase64(a.account.data[0]);
    if (d.length < 40) continue;
    const amount = Number(new DataView(d.buffer, d.byteOffset + 32, 8).getBigUint64(0, true)) / scale;
    if (amount <= 0) continue;
    const owner = b58encode(d.subarray(0, 32));
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + amount);
  }
  const eligible = new Map<string, number>();
  let holders = 0;
  for (const [owner, amount] of byOwner) {
    if (!isWallet(owner)) continue;
    holders++;
    if (exclude.has(owner) || amount < minHold) continue;
    eligible.set(owner, amount);
  }
  return { holders, eligible };
}

async function sampleMarket(env: AppEnv, db: Db, rpc: Rpc, now: number): Promise<void> {
  const mint = mintFrom(env);
  let solUsd = Number(await kvGet(db, "sol_usd")) || null;
  const priceAt = Number(await kvGet(db, "sol_usd_at")) || 0;
  const stmts: Stmt[] = [];
  if (!solUsd || now - priceAt > 5 * 60_000) {
    const p = await fetchSolUsd();
    if (p) {
      solUsd = p;
      stmts.push(kvSet(db, "sol_usd", String(p), now), kvSet(db, "sol_usd_at", String(now), now));
    }
  }
  if (mint) stmts.push(kvSet(db, "market", JSON.stringify(await readMarket(rpc, mint, solUsd, now)), now));
  if (stmts.length) await run(db, stmts);
}

async function sampleHerd(env: AppEnv, db: Db, rpc: Rpc, rid: number, now: number): Promise<void> {
  const mint = mintFrom(env);
  if (!mint) return;
  const exclude = excludedFrom(env);
  const treasury = treasuryFrom(env);
  if (treasury) exclude.add(treasury.publicKey);
  const herd = await fetchHerd(rpc, mint, exclude, env.MIN_HOLD_TOKENS ?? 100_000);
  const acc = await kvJson<Acc>(db, `acc:${rid}`, { n: 0, w: {} });
  acc.n += 1;
  for (const [w, cur] of Object.entries(acc.w)) if (!herd.eligible.has(w)) cur[1] = 0;
  for (const [w, amount] of herd.eligible) {
    const cur = acc.w[w] ?? [0, 0];
    acc.w[w] = [round2(cur[0] + amount), round2(amount)];
  }
  await run(db, [
    kvSet(db, `acc:${rid}`, JSON.stringify(acc), now),
    kvSet(db, "herd", JSON.stringify({ holders: herd.holders, eligible: herd.eligible.size, at: now }), now),
    db.prepare("UPDATE rounds SET samples = ? WHERE round_id = ?").bind(acc.n, rid),
  ]);
}

async function sampleBucket(env: AppEnv, db: Db, rpc: Rpc, now: number): Promise<void> {
  const treasury = treasuryFrom(env);
  if (!treasury) return;
  await kvSet(db, "bucket", String(await claimableLamports(rpc, treasury.publicKey)), now).run();
}

// ------------------------------------------------------------------ settlement
async function addOwed(db: Db, rows: [string, number][], now: number): Promise<void> {
  if (!rows.length) return;
  const owed = await kvJson<Record<string, number>>(db, "owed", {});
  for (const [w, v] of rows) owed[w] = (owed[w] ?? 0) + v;
  await kvSet(db, "owed", JSON.stringify(owed), now).run();
}

async function settle(db: Db, sig: string, outcome: "confirmed" | "failed", now: number): Promise<void> {
  const slips =
    (await db.prepare("SELECT wallet, amount_lamports FROM payslips WHERE tx_sig = ? AND status = 'sent'").bind(sig).all<{ wallet: string; amount_lamports: number }>())
      .results ?? [];
  if (!slips.length) return;
  const stmts: Stmt[] = [db.prepare("UPDATE payslips SET status = ? WHERE tx_sig = ? AND status = 'sent'").bind(outcome, sig)];
  if (outcome === "confirmed") {
    const total = slips.reduce((a, s) => a + s.amount_lamports, 0);
    for (const s of slips) {
      stmts.push(
        db
          .prepare(
            "INSERT INTO holders (wallet, total_paid_lamports, rounds_paid, last_paid_at) VALUES (?, ?, 1, ?) " +
              "ON CONFLICT(wallet) DO UPDATE SET total_paid_lamports = total_paid_lamports + excluded.total_paid_lamports, rounds_paid = rounds_paid + 1, last_paid_at = excluded.last_paid_at",
          )
          .bind(s.wallet, s.amount_lamports, now),
      );
    }
    stmts.push(kvAdd(db, "paid_total_lamports", total, now), kvAdd(db, "payouts_count", slips.length, now));
    await run(db, stmts);
  } else {
    await run(db, stmts);
    await addOwed(db, slips.map((s) => [s.wallet, s.amount_lamports]), now);
  }
}

async function reconcile(db: Db, rpc: Rpc, now: number): Promise<void> {
  const sent =
    (
      await db
        .prepare("SELECT tx_sig, MIN(sent_at) AS sent_at FROM payslips WHERE status = 'sent' AND tx_sig IS NOT NULL GROUP BY tx_sig LIMIT 200")
        .all<{ tx_sig: string; sent_at: number }>()
    ).results ?? [];
  if (!sent.length) return;
  const statuses = await rpc.getSignatureStatuses(sent.map((s) => s.tx_sig));
  for (let i = 0; i < sent.length; i++) {
    const st = statuses[i];
    if (st && !st.err && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) await settle(db, sent[i].tx_sig, "confirmed", now);
    else if ((st && st.err) || (!st && now - sent[i].sent_at > 150_000)) await settle(db, sent[i].tx_sig, "failed", now);
  }
}

// ------------------------------------------------------------------ milking
async function closeAs(db: Db, roundId: number, status: string, note: string, now: number): Promise<void> {
  await db
    .prepare("UPDATE rounds SET status = ?, note = ?, closed_at = ? WHERE round_id = ?")
    .bind(status, note, now, roundId)
    .run();
}

interface Budget {
  txs: number;
}

async function closeRounds(env: AppEnv, db: Db, rpc: Rpc | null, rid: number, now: number): Promise<void> {
  const rows =
    (await db.prepare("SELECT * FROM rounds WHERE round_id < ? AND status IN ('open', 'claiming', 'paying') ORDER BY round_id ASC LIMIT 4").bind(rid).all<RoundRow>())
      .results ?? [];
  const budget: Budget = { txs: MAX_PAYOUT_TXS_PER_TICK };
  for (const r of rows) {
    if (r.status === "open" && r.round_id < rid - 1) {
      await closeAs(db, r.round_id, "skipped", "the clock missed this round; its fees carry to the next milking", now);
      await db.prepare("DELETE FROM kv WHERE k = ?").bind(`acc:${r.round_id}`).run();
      continue;
    }
    if (!rpc) {
      if (r.status === "open") await closeAs(db, r.round_id, "skipped", "no Solana RPC is configured", now);
      continue;
    }
    await milk(env, db, rpc, r, now, budget);
  }
}

async function milk(env: AppEnv, db: Db, rpc: Rpc, r: RoundRow, now: number, budget: Budget): Promise<void> {
  const treasury = treasuryFrom(env);
  if (r.status === "open") {
    const reason = !mintFrom(env)
      ? "the coin has not launched yet"
      : !treasury
        ? "the treasury key is not set"
        : !milkingEnabled(env)
          ? "milking is paused"
          : null;
    const acc = await kvJson<Acc>(db, `acc:${r.round_id}`, { n: 0, w: {} });
    const empty = acc.n === 0 || Object.keys(acc.w).length === 0;
    if (reason || empty) {
      await closeAs(db, r.round_id, "skipped", reason ?? "no holders were sampled this round", now);
      await db.prepare("DELETE FROM kv WHERE k = ?").bind(`acc:${r.round_id}`).run();
      return;
    }
    await db.prepare("UPDATE rounds SET status = 'claiming' WHERE round_id = ? AND status = 'open'").bind(r.round_id).run();
    r.status = "claiming";
  }
  if (!treasury) return;
  if (r.status === "claiming") {
    const fees = await claimFees(db, rpc, treasury, r, now);
    if (!fees) return; // the claim is still landing: the next tick picks it up
    await allocate(env, db, rpc, treasury, r, fees, now);
    r.status = "paying";
  }
  if (r.status === "paying") await pour(db, rpc, treasury, r.round_id, budget, now);
}

interface Fees {
  claimed: number;
  sig: string | null;
  note: string | null;
}

/** Claims the coin's creator fees without waiting on the chain. Returns null while the claim is landing. */
async function claimFees(db: Db, rpc: Rpc, treasury: Treasury, r: RoundRow, now: number): Promise<Fees | null> {
  if (r.claim_sig) {
    const [st] = await rpc.getSignatureStatuses([r.claim_sig]);
    if (st && !st.err && st.confirmationStatus !== "processed") {
      return { claimed: Math.max(0, await lamportDelta(rpc, r.claim_sig, treasury.publicKey)), sig: r.claim_sig, note: null };
    }
    if (st?.err) return { claimed: 0, sig: r.claim_sig, note: "the claim failed on-chain; the fees carry to the next milking" };
    if (now - (r.claim_sent_at ?? 0) < 150_000) return null;
    return { claimed: 0, sig: r.claim_sig, note: "the claim did not land; the fees carry to the next milking" };
  }
  const claimable = await claimableLamports(rpc, treasury.publicKey);
  if (claimable < MIN_CLAIM_LAMPORTS) return { claimed: 0, sig: null, note: "creator fees below the minimum claim; they carry to the next milking" };
  try {
    const signed = signTransactionBytes(await buildClaimTransaction(treasury.publicKey), treasury.seed);
    const sig = transactionId(signed);
    await db.prepare("UPDATE rounds SET claim_sig = ?, claim_sent_at = ? WHERE round_id = ?").bind(sig, now, r.round_id).run();
    await rpc.sendTransaction(signed);
  } catch (e) {
    await db.prepare("UPDATE rounds SET claim_sig = NULL, claim_sent_at = NULL WHERE round_id = ?").bind(r.round_id).run();
    return { claimed: 0, sig: null, note: `claim failed: ${errMsg(e)}` };
  }
  return null;
}

/** Splits the pot across the round's holders by time-weighted balance and writes their payslips. */
async function allocate(env: AppEnv, db: Db, rpc: Rpc, treasury: Treasury, r: RoundRow, fees: Fees, now: number): Promise<void> {
  const acc = await kvJson<Acc>(db, `acc:${r.round_id}`, { n: 0, w: {} });
  const n = Math.max(1, acc.n);
  const exclude = excludedFrom(env);
  exclude.add(treasury.publicKey);
  const herd = Object.entries(acc.w)
    .filter(([w]) => !exclude.has(w))
    .map(([w, [sum]]) => ({ wallet: w, avg: sum / n }))
    .filter((x) => x.avg > 0);
  const totalAvg = herd.reduce((a, x) => a + x.avg, 0);
  const shareBps = env.MILK_SHARE_BPS ?? 8000;
  const rollover = Number(await kvGet(db, "rollover_lamports")) || 0;
  const pot = Math.floor((fees.claimed * shareBps) / 10_000) + rollover;

  const cups = new Map<string, { avg: number; shareBps: number; amount: number }>();
  let allocated = 0;
  if (pot > 0 && totalAvg > 0) {
    for (const x of herd) {
      const amount = Math.floor((pot * x.avg) / totalAvg);
      if (amount < DUST_LAMPORTS) continue; // too small to track: stays in the pot
      allocated += amount;
      cups.set(x.wallet, { avg: x.avg, shareBps: (x.avg / totalAvg) * 10_000, amount });
    }
  }
  const owed = await kvJson<Record<string, number>>(db, "owed", {});
  for (const [w, lamports] of Object.entries(owed)) {
    if (exclude.has(w) || lamports <= 0) continue;
    const cup = cups.get(w);
    if (cup) cup.amount += lamports;
    else cups.set(w, { avg: 0, shareBps: 0, amount: lamports });
  }
  const newRollover = pot - allocated;
  const all = [...cups.entries()];
  const payable = all.filter(([, c]) => c.amount >= MIN_PAYOUT_LAMPORTS).reduce((a, [, c]) => a + c.amount, 0);
  const balance = payable > 0 ? await rpc.getBalance(treasury.publicKey) : 0;
  const short = payable > 0 && payable > balance - TREASURY_RESERVE_LAMPORTS - newRollover;
  const pending = short ? [] : all.filter(([, c]) => c.amount >= MIN_PAYOUT_LAMPORTS);
  const newOwed: Record<string, number> = {};
  for (const [w, c] of all) if (short || c.amount < MIN_PAYOUT_LAMPORTS) newOwed[w] = c.amount;
  const note = short ? `${fees.note ? `${fees.note}; ` : ""}the treasury is short, cups held for the next milking` : fees.note;

  const stmts: Stmt[] = [];
  for (let i = 0; i < pending.length; i += 9) {
    const chunk = pending.slice(i, i + 9);
    stmts.push(
      db
        .prepare(
          `INSERT INTO payslips (round_id, wallet, avg_tokens, share_bps, amount_lamports, status, created_at) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, 'pending', ?)").join(", ")}`,
        )
        .bind(...chunk.flatMap(([w, c]) => [r.round_id, w, round2(c.avg), Math.round(c.shareBps * 100) / 100, c.amount, now])),
    );
  }
  stmts.push(
    kvSet(db, "owed", JSON.stringify(newOwed), now),
    kvSet(db, "rollover_lamports", String(newRollover), now),
    db
      .prepare("UPDATE rounds SET status = 'paying', claim_sig = ?, claimed_lamports = ?, pot_lamports = ?, holders_counted = ?, note = ? WHERE round_id = ?")
      .bind(fees.sig, fees.claimed, pot, herd.length, note, r.round_id),
    db.prepare("DELETE FROM kv WHERE k = ?").bind(`acc:${r.round_id}`),
  );
  await db.batch(stmts);
}

type PayGroup = [string, { lamports: number; ids: number[] }];

async function markIds(db: Db, ids: number[], sql: string, ...head: unknown[]): Promise<void> {
  const stmts: Stmt[] = [];
  for (let j = 0; j < ids.length; j += 90) {
    const part = ids.slice(j, j + 90);
    stmts.push(db.prepare(`${sql} WHERE id IN (${marks(part.length)})`).bind(...head, ...part));
  }
  if (stmts.length) await db.batch(stmts);
}

async function sendGroup(db: Db, rpc: Rpc, treasury: Treasury, blockhash: string, chunk: PayGroup[], now: number): Promise<void> {
  const ids = chunk.flatMap(([, g]) => g.ids);
  const tx = buildTransferTransaction({
    payerSeed: treasury.seed,
    recentBlockhash: blockhash,
    transfers: chunk.map(([to, g]) => ({ to, lamports: BigInt(g.lamports) })),
  });
  const sig = transactionId(tx);
  await markIds(db, ids, "UPDATE payslips SET status = 'sent', tx_sig = ?, sent_at = ?", sig, now);
  try {
    await rpc.sendTransaction(tx);
  } catch (e) {
    console.error("[dairy] payout refused", errMsg(e));
    if (chunk.length > 1) {
      // One bad recipient must not block the rest: retry them one by one.
      await markIds(db, ids, "UPDATE payslips SET status = 'pending', tx_sig = NULL, sent_at = NULL");
      for (const one of chunk) await sendGroup(db, rpc, treasury, blockhash, [one], now);
    } else await settle(db, sig, "failed", now);
  }
  // Confirmed (or credited back to the holder's next cup) by reconcile() on a later tick.
}

/** Sends the round's pending cups, PAYOUTS_PER_TX per transaction, within this tick's budget. */
async function pour(db: Db, rpc: Rpc, treasury: Treasury, roundId: number, budget: Budget, now: number): Promise<void> {
  const pending =
    (
      await db
        .prepare("SELECT id, wallet, amount_lamports FROM payslips WHERE round_id = ? AND status = 'pending' ORDER BY id LIMIT ?")
        .bind(roundId, budget.txs * PAYOUTS_PER_TX)
        .all<{ id: number; wallet: string; amount_lamports: number }>()
    ).results ?? [];
  if (pending.length) {
    const byWallet = new Map<string, { lamports: number; ids: number[] }>();
    for (const p of pending) {
      const g = byWallet.get(p.wallet) ?? { lamports: 0, ids: [] };
      g.lamports += p.amount_lamports;
      g.ids.push(p.id);
      byWallet.set(p.wallet, g);
    }
    const groups = [...byWallet.entries()];
    const blockhash = await rpc.getLatestBlockhash();
    for (let i = 0; i < groups.length && budget.txs > 0; i += PAYOUTS_PER_TX) {
      budget.txs -= 1;
      await sendGroup(db, rpc, treasury, blockhash, groups.slice(i, i + PAYOUTS_PER_TX), now);
    }
  }
  const left = await db.prepare("SELECT COUNT(*) AS n FROM payslips WHERE round_id = ? AND status = 'pending'").bind(roundId).first<{ n: number }>();
  if ((left?.n ?? 0) > 0) return; // the rest pour on the next tick
  const t = await db
    .prepare("SELECT COUNT(DISTINCT wallet) AS n, COALESCE(SUM(amount_lamports), 0) AS total FROM payslips WHERE round_id = ? AND status IN ('sent', 'confirmed')")
    .bind(roundId)
    .first<{ n: number; total: number }>();
  await db
    .prepare("UPDATE rounds SET status = 'paid', paid_lamports = ?, holders_paid = ?, closed_at = ? WHERE round_id = ?")
    .bind(t?.total ?? 0, t?.n ?? 0, now, roundId)
    .run();
}

// ------------------------------------------------------------------ snapshot


export async function buildSnapshot(env: AppEnv, db: Db, now: number): Promise<DairySnapshot> {
  const rid = roundIdAt(now);
  const [kvRes, ledgerRes, lastRes, roundRes, countRes] = await db.batch([
    db.prepare(
      "SELECT k, v FROM kv WHERE k IN ('market', 'herd', 'bucket', 'paid_total_lamports', 'payouts_count', 'rollover_lamports', 'sol_usd', 'moos')",
    ),
    db.prepare(
      "SELECT round_id, claimed_lamports, pot_lamports, holders_counted, claim_sig, note, closed_at FROM rounds WHERE status = 'paid' ORDER BY round_id DESC LIMIT 12",
    ),
    db.prepare("SELECT round_id, status, note, closed_at FROM rounds WHERE status IN ('paid', 'skipped') ORDER BY round_id DESC LIMIT 1"),
    db.prepare("SELECT samples FROM rounds WHERE round_id = ?").bind(rid),
    db.prepare("SELECT COUNT(*) AS n FROM rounds WHERE status = 'paid'"),
  ]);
  const kv = Object.fromEntries(((kvRes.results ?? []) as { k: string; v: string }[]).map((x) => [x.k, x.v]));
  const parse = <T,>(s: string | undefined): T | null => {
    try {
      return s ? (JSON.parse(s) as T) : null;
    } catch {
      return null;
    }
  };
  type LedgerQ = { round_id: number; claimed_lamports: number; pot_lamports: number; holders_counted: number; claim_sig: string | null; note: string | null; closed_at: number | null };
  const rows = (ledgerRes.results ?? []) as LedgerQ[];
  const sums = new Map<number, { poured: number; pouring: number; cups: number }>();
  if (rows.length) {
    const q = await db
      .prepare(
        `SELECT round_id, SUM(CASE WHEN status = 'confirmed' THEN amount_lamports ELSE 0 END) AS poured, ` +
          `SUM(CASE WHEN status IN ('pending', 'sent') THEN amount_lamports ELSE 0 END) AS pouring, COUNT(*) AS cups ` +
          `FROM payslips WHERE round_id IN (${marks(rows.length)}) GROUP BY round_id`,
      )
      .bind(...rows.map((x) => x.round_id))
      .all<{ round_id: number; poured: number; pouring: number; cups: number }>();
    for (const s of q.results ?? []) sums.set(Number(s.round_id), { poured: Number(s.poured), pouring: Number(s.pouring), cups: Number(s.cups) });
  }
  const herd = parse<{ holders: number; eligible: number; at: number }>(kv.herd);
  const treasury = treasuryFrom(env);
  const owed = await kvJson<Record<string, number>>(db, "owed", {});
  const inFlight = await db
    .prepare("SELECT COALESCE(SUM(amount_lamports), 0) AS n FROM payslips WHERE status IN ('pending', 'sent')")
    .first<{ n: number }>();
  const liabilities =
    (Number(kv.rollover_lamports) || 0) + Object.values(owed).reduce((a, v) => a + (Number(v) || 0), 0) + Number(inFlight?.n ?? 0);
  const last = (lastRes.results?.[0] ?? null) as { round_id: number; status: string; note: string | null; closed_at: number | null } | null;
  return {
    generatedAt: now,
    roundId: rid,
    roundEndsAt: roundEndMs(rid),
    milkingMs: MILKING_MS,
    tickMs: TICK_MS,
    config: {
      db: true,
      rpc: Boolean(env.RPC_URL),
      treasury: Boolean(treasury),
      mint: Boolean(mintFrom(env)),
      milking: milkingEnabled(env),
      shareBps: env.MILK_SHARE_BPS ?? 8000,
      minHoldTokens: env.MIN_HOLD_TOKENS ?? 100_000,
    },
    coin: parse<Market>(kv.market),
    solUsd: Number(kv.sol_usd) || null,
    bucket: { claimableLamports: kv.bucket !== undefined ? Number(kv.bucket) : null, rolloverLamports: Number(kv.rollover_lamports) || 0 },
    herd: {
      holders: herd?.holders ?? null,
      eligible: herd?.eligible ?? null,
      sampledAt: herd?.at ?? null,
      samplesThisRound: Number((roundRes.results?.[0] as { samples?: number } | undefined)?.samples ?? 0),
    },
    totals: {
      pouredLamports: Number(kv.paid_total_lamports) || 0,
      payouts: Number(kv.payouts_count) || 0,
      roundsPaid: Number((countRes.results?.[0] as { n?: number } | undefined)?.n ?? 0),
    },
    treasury: { address: treasury?.publicKey ?? null, liabilitiesLamports: liabilities },
    ledger: rows.map((x) => {
      const s = sums.get(Number(x.round_id)) ?? { poured: 0, pouring: 0, cups: 0 };
      return {
        roundId: Number(x.round_id),
        claimedLamports: Number(x.claimed_lamports),
        potLamports: Number(x.pot_lamports),
        pouredLamports: s.poured,
        pouringLamports: s.pouring,
        cups: s.cups,
        holdersCounted: Number(x.holders_counted),
        claimSig: x.claim_sig,
        note: x.note,
        closedAt: x.closed_at === null ? null : Number(x.closed_at),
      };
    }),
    lastRound: last ? { roundId: Number(last.round_id), status: last.status, note: last.note, closedAt: last.closed_at === null ? null : Number(last.closed_at) } : null,
    moos: Number(kv.moos) || 0,
  };
}

export async function writeSnapshot(env: AppEnv, db: Db, now: number): Promise<string> {
  const json = JSON.stringify(await buildSnapshot(env, db, now));
  await kvSet(db, "snapshot", json, now).run();
  return json;
}

// ------------------------------------------------------------------ the clock
async function guard(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[dairy:${label}]`, errMsg(e));
  }
}

/** One heartbeat of the dairy. Called once a minute by runTickIfDue(). */
export async function runTick(env: AppEnv, now: number): Promise<void> {
  const db = env.DB;
  if (!db) return;
  const rid = roundIdAt(now);
  await db.prepare("INSERT OR IGNORE INTO rounds (round_id) VALUES (?)").bind(rid).run();
  const marketUrl = rpcUrlFor(env, "market");
  if (marketUrl) await guard("market", () => sampleMarket(env, db, new Rpc(marketUrl), now));
  const rpc = env.RPC_URL ? new Rpc(env.RPC_URL) : null;
  if (rpc) {
    await guard("herd", () => sampleHerd(env, db, rpc, rid, now));
    await guard("bucket", () => sampleBucket(env, db, rpc, now));
    await guard("reconcile", () => reconcile(db, rpc, now));
  }
  await guard("milk", () => closeRounds(env, db, rpc, rid, now));
  await guard("snapshot", () => writeSnapshot(env, db, now));
}

/**
 * The clock: runs one tick unless one ran in the last ~45 s or another run holds the lock.
 * Called by /api/cron/tick (the pinger) and, as a fallback, after page visits when the clock looks late.
 */
export async function runTickIfDue(env: AppEnv): Promise<{ ran: boolean; reason?: string; roundId?: number }> {
  const db = env.DB;
  if (!db) return { ran: false, reason: "no database" };
  const now = Date.now();
  const last = Number(await kvGet(db, "last_tick_at")) || 0;
  if (now - last < TICK_MS * 0.75) return { ran: false, reason: "not due yet" };
  await db.prepare("INSERT OR IGNORE INTO kv (k, v, updated_at) VALUES ('tick_lock', '0', 0)").run();
  const lock = await db
    .prepare("UPDATE kv SET v = ?, updated_at = ? WHERE k = 'tick_lock' AND updated_at < ?")
    .bind(String(now), now, now - 120_000)
    .run();
  if (lock.meta.changes === 0) return { ran: false, reason: "another tick is running" };
  try {
    await runTick(env, now);
    await kvSet(db, "last_tick_at", String(now), now).run();
    return { ran: true, roundId: roundIdAt(now) };
  } finally {
    await db.prepare("UPDATE kv SET updated_at = 0 WHERE k = 'tick_lock' AND v = ?").bind(String(now)).run();
  }
}

// ------------------------------------------------------------------ cups (wallet lookups)

export async function cupFor(env: AppEnv, db: Db, wallet: string, now = Date.now()): Promise<CupView> {
  const rid = roundIdAt(now);
  const [acc, owed, holder, slips, bucket, rollover] = await Promise.all([
    kvJson<Acc>(db, `acc:${rid}`, { n: 0, w: {} }),
    kvJson<Record<string, number>>(db, "owed", {}),
    db.prepare("SELECT total_paid_lamports, rounds_paid FROM holders WHERE wallet = ?").bind(wallet).first<{ total_paid_lamports: number; rounds_paid: number }>(),
    db
      .prepare("SELECT round_id, amount_lamports, status, tx_sig, created_at FROM payslips WHERE wallet = ? ORDER BY id DESC LIMIT 12")
      .bind(wallet)
      .all<{ round_id: number; amount_lamports: number; status: string; tx_sig: string | null; created_at: number }>(),
    kvGet(db, "bucket"),
    kvGet(db, "rollover_lamports"),
  ]);
  const n = Math.max(1, acc.n);
  const entry = acc.w[wallet];
  const avg = entry ? entry[0] / n : 0;
  let totalAvg = 0;
  for (const [sum] of Object.values(acc.w)) totalAvg += sum / n;
  const share = totalAvg > 0 ? avg / totalAvg : 0;
  const potNow = Math.floor((Number(bucket ?? 0) * (env.MILK_SHARE_BPS ?? 8000)) / 10_000) + (Number(rollover) || 0);
  return {
    wallet,
    roundId: rid,
    samples: acc.n,
    inHerd: Boolean(entry && entry[1] > 0),
    latestTokens: entry ? entry[1] : null,
    avgTokens: round2(avg),
    sharePct: Math.round(share * 1_000_000) / 10_000,
    estimatedLamports: Math.floor(potNow * share),
    receivedLamports: Number(holder?.total_paid_lamports ?? 0),
    roundsPaid: Number(holder?.rounds_paid ?? 0),
    owedLamports: Number(owed[wallet] ?? 0),
    recent: (slips.results ?? []).map((s) => ({
      roundId: Number(s.round_id),
      amountLamports: Number(s.amount_lamports),
      status: s.status,
      txSig: s.tx_sig,
      at: Number(s.created_at),
    })),
  };
}

// ------------------------------------------------------------------ before the database exists
/** A snapshot with live market data only, for a site deployed before Turso is connected. */
export async function liteSnapshot(env: AppEnv, now: number): Promise<DairySnapshot> {
  const rid = roundIdAt(now);
  const mint = mintFrom(env);
  const url = rpcUrlFor(env, "market");
  const coin = mint && url ? await readMarket(new Rpc(url), mint, null, now).catch(() => null) : null;
  return {
    generatedAt: now,
    roundId: rid,
    roundEndsAt: roundEndMs(rid),
    milkingMs: MILKING_MS,
    tickMs: TICK_MS,
    config: {
      db: false,
      rpc: Boolean(env.RPC_URL),
      treasury: Boolean(treasuryFrom(env)),
      mint: Boolean(mint),
      milking: false,
      shareBps: env.MILK_SHARE_BPS ?? 8000,
      minHoldTokens: env.MIN_HOLD_TOKENS ?? 100_000,
    },
    coin,
    solUsd: coin?.solUsd ?? null,
    bucket: { claimableLamports: null, rolloverLamports: 0 },
    herd: { holders: null, eligible: null, sampledAt: null, samplesThisRound: 0 },
    totals: { pouredLamports: 0, payouts: 0, roundsPaid: 0 },
    treasury: { address: treasuryFrom(env)?.publicKey ?? null, liabilitiesLamports: 0 },
    ledger: [],
    lastRound: null,
    moos: 0,
  };
}
