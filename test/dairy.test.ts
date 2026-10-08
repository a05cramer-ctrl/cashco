// End-to-end milking simulation: SQLite standing in for Turso, a fake Solana behind fetch.
// Run with `bun test`.
import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import * as cfg from "../src/lib/config.ts";
import { cupFor, runTick, runTickIfDue } from "../src/lib/dairy.server.ts";
import { SCHEMA } from "../src/lib/schema.ts";
import * as sol from "../src/lib/solana.ts";

function shim(db: Database) {
  const mk = (sql: string, args: unknown[] = []) => ({
    sql,
    args,
    bind: (...a: unknown[]) => mk(sql, a),
    first: async () => db.query(sql).get(...(args as never[])) ?? null,
    all: async () => ({ results: db.query(sql).all(...(args as never[])) }),
    run: async () => ({ meta: { changes: db.query(sql).run(...(args as never[])).changes } }),
  });
  return {
    prepare: (sql: string) => mk(sql),
    batch: async (stmts: ReturnType<typeof mk>[]) =>
      db.transaction(() =>
        stmts.map((s) =>
          /^\s*(SELECT|WITH)/i.test(s.sql)
            ? { results: db.query(s.sql).all(...(s.args as never[])) }
            : (db.query(s.sql).run(...(s.args as never[])), { results: [] }),
        ),
      )(),
  };
}

function freshDb() {
  const raw = new Database(":memory:");
  raw.exec(SCHEMA);
  return { raw, DB: shim(raw) as never };
}

// ---- the fake chain
const treasury = sol.newKeypair();
const mint = sol.newKeypair().publicKey;
const curve = sol.bondingCurveAddress(mint);
const A = sol.newKeypair().publicKey; // 1M tokens all round
const B = sol.newKeypair().publicKey; // 3M tokens all round
const C = sol.newKeypair().publicKey; // 1M tokens, joins for the last count only
const D = sol.newKeypair().publicKey; // 50k tokens: under the minimum
const E = sol.newKeypair().publicKey; // 300 tokens: a dust cup that accrues
const state = { cJoined: false, eHolds: false, claimable: 50_000_000 };

function tokenAccount(owner: string, tokens: number): { pubkey: string; account: { data: [string, string]; owner: string; lamports: number } } {
  const d = new Uint8Array(40);
  d.set(sol.b58decode(owner), 0);
  new DataView(d.buffer).setBigUint64(32, BigInt(Math.round(tokens * 1e6)), true);
  return { pubkey: sol.newKeypair().publicKey, account: { data: [sol.toBase64(d), "base64"], owner: cfg.PROGRAMS.token2022, lamports: 2_039_280 } };
}

function mintAccount() {
  const d = new Uint8Array(300);
  d[44] = 6;
  return { owner: cfg.PROGRAMS.token2022, lamports: 1e7, data: [sol.toBase64(d), "base64"] };
}

function curveAccount() {
  const d = new Uint8Array(151);
  const dv = new DataView(d.buffer);
  dv.setBigUint64(8, 1_000_000_000_000_000n, true); // virtual tokens
  dv.setBigUint64(16, 60_000_000_000n, true); // virtual SOL: mcap 60 SOL
  dv.setBigUint64(24, 396_550_000_000_000n, true); // real tokens left: half the curve sold
  dv.setBigUint64(40, 1_000_000_000_000_000n, true);
  d.set(sol.b58decode(treasury.publicKey), 49);
  return { owner: cfg.PROGRAMS.pump, lamports: 1e9, data: [sol.toBase64(d), "base64"] };
}

const sent: { sig: string; recipients: string[]; lamports: bigint[] }[] = [];
let claimTx = "";
let claimedFor = 0;

function decodeTransfers(bytes: Uint8Array) {
  const tx = sol.parseTransaction(bytes);
  const recipients = tx.staticKeys.slice(1, -2);
  // instruction data: each transfer is [2,0,0,0] + u64 lamports; read them back from the message
  const lamports: bigint[] = [];
  const m = tx.message;
  for (let i = 0; i + 12 <= m.length; i++) {
    if (m[i] === 12 && m[i + 1] === 2 && m[i + 2] === 0 && m[i + 3] === 0 && m[i + 4] === 0) {
      lamports.push(new DataView(m.buffer, m.byteOffset + i + 5, 8).getBigUint64(0, true));
    }
  }
  return { recipients, lamports };
}

globalThis.fetch = (async (url: string, init?: { body: string }) => {
  const u = String(url);
  const reply = (result: unknown) => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
  if (u.startsWith("https://rpc.test")) {
    const { method, params } = JSON.parse(init!.body);
    if (method === "getAccountInfo") return reply({ value: params[0] === curve ? curveAccount() : null });
    if (method === "getMultipleAccounts")
      return reply({
        value: params[0].map((k: string) => {
          if (k === mint) return mintAccount();
          if (k === curve) return curveAccount();
          if (k === sol.pumpCreatorVault(treasury.publicKey)) return { owner: cfg.PROGRAMS.pump, lamports: state.claimable + 890_880, data: ["", "base64"] };
          return null;
        }),
      });
    if (method === "getProgramAccounts") {
      const list = [tokenAccount(A, 1_000_000), tokenAccount(B, 2_000_000), tokenAccount(B, 1_000_000), tokenAccount(D, 50_000), tokenAccount(curve, 600_000_000), tokenAccount(treasury.publicKey, 20_000_000)];
      if (state.cJoined) list.push(tokenAccount(C, 1_000_000));
      if (state.eHolds) list.push(tokenAccount(E, 100_000));
      return reply(list);
    }
    if (method === "getTokenAccountBalance") return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "not found" } }));
    if (method === "getLatestBlockhash") return reply({ value: { blockhash: sol.newKeypair().publicKey } });
    if (method === "getBalance") return reply({ value: 2_000_000_000 });
    if (method === "sendTransaction") {
      const bytes = sol.fromBase64(params[0]);
      const tx = sol.parseTransaction(bytes);
      if (!sol.isSignedBy(tx, treasury.publicKey)) throw new Error("treasury signature missing");
      const sig = sol.transactionId(bytes);
      if (sig !== claimTx) sent.push({ sig, ...decodeTransfers(bytes) });
      return reply(sig);
    }
    if (method === "getSignatureStatuses")
      return reply({ value: params[0].map((s: string) => (sent.some((x) => x.sig === s) || s === claimTx ? { confirmationStatus: "confirmed", err: null } : null)) });
    if (method === "getTransaction")
      return reply(
        params[0] === claimTx
          ? { meta: { err: null, fee: 5000, preBalances: [1e9], postBalances: [1e9 + claimedFor - 5000] }, transaction: { message: { accountKeys: [treasury.publicKey] } } }
          : null,
      );
    throw new Error(`unmocked rpc ${method}`);
  }
  if (u.startsWith("https://pumpportal.fun")) {
    const tx = sol.buildTransferTransaction({ payerSeed: treasury.seed, recentBlockhash: sol.newKeypair().publicKey, transfers: [{ to: sol.newKeypair().publicKey, lamports: 1n }] });
    claimTx = sol.transactionId(sol.signTransactionBytes(tx, treasury.seed));
    claimedFor = state.claimable;
    return new Response(tx);
  }
  if (u.includes("dexscreener")) return new Response("[]");
  throw new Error(`unmocked fetch ${u}`);
}) as typeof fetch;

const secret = sol.b58encode(new Uint8Array([...treasury.seed, ...sol.b58decode(treasury.publicKey)]));
const envFor = (DB: never) =>
  ({ DB, RPC_URL: "https://rpc.test", TREASURY_SECRET_KEY: secret, COIN_MINT: mint, MILKING_ENABLED: "true", MILK_SHARE_BPS: 8000, MIN_HOLD_TOKENS: 100_000 }) as never;

test("a milking round pours the claimed fees to holders by time-weighted balance", async () => {
  const { raw, DB } = freshDb();
  const env = envFor(DB);
  const R = 6_000_000;
  const t0 = R * cfg.MILKING_MS + 1000;
  for (let k = 0; k < 5; k++) {
    state.cJoined = k === 4; // C buys a minute before the milking
    await runTick(env, t0 + k * cfg.TICK_MS);
  }
  const acc = JSON.parse((raw.query("SELECT v FROM kv WHERE k = ?").get(`acc:${R}`) as { v: string }).v);
  expect(acc.n).toBe(5);
  expect(Object.keys(acc.w).sort()).toEqual([A, B, C].sort()); // D under the minimum, curve PDA and treasury excluded
  expect(acc.w[B][0]).toBe(15_000_000); // two token accounts summed, five counts

  const snap = JSON.parse((raw.query("SELECT v FROM kv WHERE k = 'snapshot'").get() as { v: string }).v);
  expect(snap.coin.mcapSol).toBeCloseTo(60, 5);
  expect(snap.coin.curvePct).toBe(50);
  expect(snap.herd.eligible).toBe(3);

  const t1 = (R + 1) * cfg.MILKING_MS + 1000;
  await runTick(env, t1); // milking: the claim is sent, nothing waits on the chain
  let round = raw.query("SELECT * FROM rounds WHERE round_id = ?").get(R) as Record<string, unknown>;
  expect(round.status).toBe("claiming");
  expect(round.claim_sig).toBe(claimTx);

  await runTick(env, t1 + cfg.TICK_MS); // claim confirmed: split and pour
  round = raw.query("SELECT * FROM rounds WHERE round_id = ?").get(R) as Record<string, unknown>;
  expect(round.status).toBe("paid");
  expect(round.claimed_lamports).toBe(50_000_000);
  expect(round.pot_lamports).toBe(40_000_000); // 80% of the claim
  const slips = raw.query("SELECT wallet, amount_lamports, status FROM payslips WHERE round_id = ? ORDER BY amount_lamports DESC").all(R) as {
    wallet: string;
    amount_lamports: number;
    status: string;
  }[];
  expect(slips.map((s) => [s.wallet, s.amount_lamports, s.status])).toEqual([
    [B, 28_571_428, "sent"], // avg 3M of 4.2M
    [A, 9_523_809, "sent"], // avg 1M
    [C, 1_904_761, "sent"], // avg 0.2M: one count of five
  ]);
  expect(sent.length).toBe(1);
  expect(sent[0].recipients.sort()).toEqual([A, B, C].sort());
  expect(sent[0].lamports.map(Number).sort((a, b) => b - a)).toEqual([28_571_428, 9_523_809, 1_904_761]);

  await runTick(env, t1 + 2 * cfg.TICK_MS); // payouts confirmed
  const paid = raw.query("SELECT status FROM payslips WHERE round_id = ?").all(R) as { status: string }[];
  expect(paid.every((p) => p.status === "confirmed")).toBe(true);
  expect((raw.query("SELECT v FROM kv WHERE k = 'paid_total_lamports'").get() as { v: string }).v).toBe("39999998");
  expect((raw.query("SELECT total_paid_lamports FROM holders WHERE wallet = ?").get(B) as { total_paid_lamports: number }).total_paid_lamports).toBe(28_571_428);
  expect(Number((raw.query("SELECT v FROM kv WHERE k = 'rollover_lamports'").get() as { v: string }).v)).toBe(2);

  const cup = await cupFor(env, DB, B, t1 + 2 * cfg.TICK_MS);
  expect(cup.receivedLamports).toBe(28_571_428);
  expect(cup.inHerd).toBe(true);
  expect(cup.sharePct).toBeGreaterThan(50);
});

test("cups under 0.001 SOL wait and are poured once they add up", async () => {
  const { raw, DB } = freshDb();
  const env = envFor(DB);
  state.cJoined = false;
  state.eHolds = true;
  state.claimable = 2_500_000; // a quiet round: 0.0025 SOL of fees
  let R = 7_000_000;
  for (let round = 0; round < 3; round++, R++) {
    const t0 = R * cfg.MILKING_MS + 1000;
    for (let k = 0; k < 5; k++) await runTick(env, t0 + k * cfg.TICK_MS);
    const t1 = (R + 1) * cfg.MILKING_MS + 1000;
    await runTick(env, t1);
    await runTick(env, t1 + cfg.TICK_MS);
  }
  const owed = JSON.parse((raw.query("SELECT v FROM kv WHERE k = 'owed'").get() as { v: string }).v) as Record<string, number>;
  // E holds 0.1M of 4.1M: about 48,780 lamports a round, saved up rather than sent as dust
  expect(owed[E]).toBeGreaterThan(100_000);
  expect(raw.query("SELECT COUNT(*) AS n FROM payslips WHERE wallet = ?").get(E)).toEqual({ n: 0 });
  // B's cups (about 1.46M lamports a round) clear the minimum and are poured every round
  const bSlips = raw.query("SELECT COUNT(*) AS n FROM payslips WHERE wallet = ?").get(B) as { n: number };
  expect(bSlips.n).toBe(3);
  state.eHolds = false;
  state.claimable = 50_000_000;
});

test("the clock runs once per minute and never twice at the same time", async () => {
  const { DB } = freshDb();
  const env = { DB } as never;
  const [a, b] = await Promise.all([runTickIfDue(env), runTickIfDue(env)]);
  expect([a.ran, b.ran].filter(Boolean).length).toBe(1);
  const again = await runTickIfDue(env);
  expect(again).toEqual({ ran: false, reason: "not due yet" });
});
