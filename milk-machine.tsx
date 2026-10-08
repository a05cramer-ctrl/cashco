"use client";

// The live panel: the round countdown (a bottle that fills), the bucket of unclaimed creator fees,
// the herd, the market, a wallet lookup and the ledger of recent milkings.
import { Fragment, useEffect, useState, type FormEvent } from "react";

import { BRAND, links, sharePct } from "@/brand";
import { MILKING_MS, MIN_PAYOUT_LAMPORTS } from "@/lib/config";
import { ago, clock, int, sol, tokens, usd } from "@/lib/format";
import type { CupView, DairySnapshot, MilkingCup } from "@/lib/types";

import { Cow } from "./cow";
import { ExternalIcon } from "./icons";
import { useDairy, useNow } from "./state";

function statusOf(s: DairySnapshot | null, error: string | null): { live: boolean; text: string } {
  if (!s) return { live: false, text: error ? "The barn is not answering right now. Retrying…" : "Connecting to the barn…" };
  if (!s.config.mint) return { live: false, text: `Milking starts the minute $${BRAND.ticker} launches. The machine is built and waiting.` };
  if (!s.config.db || !s.config.rpc) return { live: false, text: "The milking ledger is being wired up. Market data below is live." };
  if (!s.config.treasury || !s.config.milking) return { live: false, text: "Milking is paused for a moment. Holders keep their place in the herd." };
  return { live: true, text: `Live · milking #${s.roundId} · ${s.herd.samplesThisRound} herd count${s.herd.samplesThisRound === 1 ? "" : "s"} this round` };
}

export function MilkMachine() {
  const { snapshot: s, error } = useDairy();
  const now = useNow(1000);
  const msLeft = now === null ? null : Math.ceil(now / MILKING_MS) * MILKING_MS - now;
  const fill = msLeft === null ? 0 : 1 - msLeft / MILKING_MS;
  const status = statusOf(s, error);
  const last = s?.ledger[0] ?? null;
  const usdOf = (lamports: number | null | undefined) => (lamports != null && s?.solUsd ? usd((lamports / 1e9) * s.solUsd) : null);

  return (
    <section className="section dark milk" id="milk">
      <div className="container">
        <header className="section-head reveal">
          <span className="kicker">
            <span className={status.live ? "live-dot" : "live-dot live-dot--off"} aria-hidden="true" /> The milking machine
          </span>
          <h2 className="h-display h2">
            Milked every <mark>5 minutes</mark>.
          </h2>
          <p className="lead">
            pump.fun pays ${BRAND.ticker}&apos;s creator a cut of every trade. That cut piles up in the bucket. Every five minutes the machine
            claims it and pours {sharePct()} of it to the herd, split by how much each wallet held during the round.
          </p>
          <div className="status-line" role="status">
            <span className={status.live ? "live-dot" : "live-dot live-dot--off"} aria-hidden="true" />
            <span>{status.text}</span>
          </div>
        </header>

        <div className="milk__grid">
          <div className="panel bottle-card reveal">
            <MilkBottle fill={fill} />
            <span className="bottle__countdown">Next milking in</span>
            <span className="bottle__clock" aria-live="off">
              {msLeft === null ? "--:--" : clock(msLeft)}
            </span>
          </div>
          <div className="stats">
            <Stat label="In the bucket" value={s?.bucket.claimableLamports != null ? `◎ ${sol(s.bucket.claimableLamports)}` : "–"} sub={usdOf(s?.bucket.claimableLamports) ? `${usdOf(s?.bucket.claimableLamports)} of creator fees waiting` : "creator fees waiting to be milked"} />
            <Stat
              label="Poured to holders"
              value={`◎ ${sol(s?.totals.pouredLamports ?? 0)}`}
              sub={`${int(s?.totals.payouts ?? 0)} cups over ${int(s?.totals.roundsPaid ?? 0)} milkings`}
              accent
            />
            <Stat
              label="Cows in the herd"
              value={int(s?.herd.eligible)}
              sub={s?.herd.holders != null ? `${int(s.herd.holders)} holders · min ${tokens(s.config.minHoldTokens)} $${BRAND.ticker}` : `hold ${tokens(s?.config.minHoldTokens ?? 100_000)}+ $${BRAND.ticker} to join`}
            />
            <Stat label="Market cap" value={usd(s?.coin?.mcapUsd)} sub={s?.coin?.mcapSol != null ? `◎ ${int(s.coin.mcapSol)}` : "–"} />
            <div className="panel stat reveal">
              <span className="stat__label">Bonding curve</span>
              <span className="stat__value">{s?.coin?.curvePct != null ? `${s.coin.curvePct.toFixed(1)}%` : "–"}</span>
              <div className="curvebar" aria-hidden="true">
                <div className="curvebar__fill" style={{ width: `${Math.min(100, s?.coin?.curvePct ?? 0)}%` }} />
              </div>
              <span className="stat__sub">{s?.coin?.bonded ? "Graduated to PumpSwap" : "of the way to graduation"}</span>
            </div>
            <Stat
              label="Last milking"
              value={last ? `◎ ${sol(last.pouredLamports + last.pouringLamports)}` : "–"}
              sub={last && now ? `${int(last.cups)} cups · ${ago(last.closedAt ?? now, now)}` : "no milkings yet"}
            />
          </div>
        </div>

        <div className="milk__lower">
          <CupCheck />
          <Ledger snapshot={s} />
        </div>

        <div className="milk__rules">
          <div className="panel rule reveal">
            <span className="rule__n">1</span>
            <b>Milk o&apos;clock</b>
            Every 5 minutes the treasury claims the coin&apos;s pump.fun creator fees, on-chain.
          </div>
          <div className="panel rule reveal">
            <span className="rule__n">2</span>
            <b>Time-weighted</b>
            Your cup follows your average balance across the round&apos;s herd counts. Buying a minute before the milking gets a sip, not a
            bucket.
          </div>
          <div className="panel rule reveal">
            <span className="rule__n">3</span>
            <b>Real cows only</b>
            Hold {tokens(s?.config.minHoldTokens ?? 100_000)}+ ${BRAND.ticker}. The bonding curve, pools and the dev wallet never get milk.
          </div>
          <div className="panel rule reveal">
            <span className="rule__n">4</span>
            <b>No spilled milk</b>
            Cups under ◎ {MIN_PAYOUT_LAMPORTS / 1e9} wait for your next milking, so dust adds up instead of disappearing.
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="panel stat reveal">
      <span className="stat__label">{label}</span>
      <span className={accent ? "stat__value up" : "stat__value"}>{value}</span>
      <span className="stat__sub">{sub}</span>
    </div>
  );
}

function MilkBottle({ fill }: { fill: number }) {
  const top = 92;
  const bottom = 282;
  const level = bottom - (bottom - top) * Math.max(0.04, Math.min(1, fill));
  return (
    <svg className="bottle" viewBox="0 0 200 300" aria-hidden="true">
      <defs>
        <clipPath id="bottle-in">
          <path d="M74 52 h52 v26 c18 12 30 30 30 54 v136 c0 12 -8 20 -20 20 h-72 c-12 0 -20 -8 -20 -20 v-136 c0 -24 12 -42 30 -54 Z" />
        </clipPath>
      </defs>
      <path d="M74 52 h52 v26 c18 12 30 30 30 54 v136 c0 12 -8 20 -20 20 h-72 c-12 0 -20 -8 -20 -20 v-136 c0 -24 12 -42 30 -54 Z" fill="rgba(134,239,172,0.06)" />
      <g clipPath="url(#bottle-in)">
        <g style={{ transition: "transform 1s linear", transform: `translateY(${level}px)` }}>
          <path className="milkwave" d="M-200 10 q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V400 H-200 Z" fill="#fbfef9" />
        </g>
      </g>
      <path d="M74 52 h52 v26 c18 12 30 30 30 54 v136 c0 12 -8 20 -20 20 h-72 c-12 0 -20 -8 -20 -20 v-136 c0 -24 12 -42 30 -54 Z" fill="none" stroke="#86efac" strokeWidth="5" strokeLinejoin="round" />
      <rect x="68" y="30" width="64" height="24" rx="6" fill="#86efac" stroke="#0b0b0e" strokeWidth="3" />
      <rect x="44" y="170" width="112" height="44" rx="6" fill="#0b0b0e" stroke="#86efac" strokeWidth="3" />
      <text x="100" y="200" textAnchor="middle" fill="#86efac" fontSize="20" fontWeight="800" style={{ fontFamily: "var(--font-display)" }}>
        {Math.round(Math.max(0, Math.min(1, fill)) * 100)}% FULL
      </text>
    </svg>
  );
}

function CupCheck() {
  const [wallet, setWallet] = useState("");
  const [cup, setCup] = useState<CupView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cashcow:wallet");
      if (saved) setWallet(saved);
    } catch {
      // storage blocked
    }
  }, []);

  async function check(e: FormEvent) {
    e.preventDefault();
    const w = wallet.trim();
    if (!w) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/cup/${encodeURIComponent(w)}`);
      const json = (await res.json()) as CupView & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not check that wallet.");
      setCup(json);
      try {
        window.localStorage.setItem("cashcow:wallet", w);
      } catch {
        // storage blocked
      }
    } catch (e2) {
      setCup(null);
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel cup reveal">
      <h3>Check your cup</h3>
      <p>Paste a wallet to see its place in this round&apos;s herd and every drop of milk it has received.</p>
      <form className="cup__form" onSubmit={check}>
        <label className="sr-only" htmlFor="cup-wallet">
          Wallet address
        </label>
        <input
          id="cup-wallet"
          className="input"
          placeholder="Your Solana wallet address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn-app" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
      {err ? <p className="cup__msg cup__msg--err">{err}</p> : null}
      {cup ? (
        <>
          <div className="cup__result">
            <div className="cup__cell">
              <span>Holding now</span>
              <b>{cup.latestTokens ? tokens(cup.latestTokens) : "0"}</b>
            </div>
            <div className="cup__cell">
              <span>Share of this round</span>
              <b>{cup.sharePct ? `${cup.sharePct.toFixed(cup.sharePct < 1 ? 3 : 2)}%` : "0%"}</b>
            </div>
            <div className="cup__cell">
              <span>Next cup (estimate)</span>
              <b>◎ {sol(cup.estimatedLamports, 4)}</b>
            </div>
            <div className="cup__cell">
              <span>Milk received</span>
              <b className="up">◎ {sol(cup.receivedLamports, 4)}</b>
            </div>
          </div>
          <p className="cup__msg">
            {cup.inHerd
              ? `In the herd: counted in ${cup.samples} of this round's herd counts. ${cup.owedLamports ? `◎ ${sol(cup.owedLamports, 4)} is saved up for your next cup.` : ""}`
              : "Not in the herd yet. Hold the minimum and you are counted at the next herd count."}
          </p>
        </>
      ) : (
        <div className="cup__result cup__result--ghost" aria-hidden="true">
          {["Holding now", "Share of this round", "Next cup (estimate)", "Milk received"].map((l) => (
            <div className="cup__cell" key={l}>
              <span>{l}</span>
              <b>–</b>
            </div>
          ))}
        </div>
      )}
      <Cow className="cup__cow" holding="milk" expression={cup?.inHerd ? "joy" : "happy"} />
    </div>
  );
}

function Ledger({ snapshot }: { snapshot: DairySnapshot | null }) {
  const now = useNow(15_000);
  const [open, setOpen] = useState<number | null>(null);
  const [cups, setCups] = useState<Record<number, MilkingCup[] | "loading" | "error">>({});
  const rows = snapshot?.ledger ?? [];

  async function toggle(id: number) {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (cups[id] && cups[id] !== "error") return;
    setCups((c) => ({ ...c, [id]: "loading" }));
    try {
      const res = await fetch(`/api/milking/${id}`);
      const json = (await res.json()) as { cups?: MilkingCup[] };
      setCups((c) => ({ ...c, [id]: json.cups ?? [] }));
    } catch {
      setCups((c) => ({ ...c, [id]: "error" }));
    }
  }

  return (
    <div className="panel ledger reveal">
      <h3>The milk ledger</h3>
      <p>Every milking, on-chain. Tap a row for the cups.</p>
      {rows.length === 0 ? (
        <div className="empty">{snapshot?.lastRound?.note ? `Last round: ${snapshot.lastRound.note}.` : "The first milking shows up here."}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Milking</th>
                <th>Claimed</th>
                <th>Poured</th>
                <th>Cups</th>
                <th>Claim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.roundId}>
                  <tr>
                    <td>
                      <button className="table__expand" type="button" onClick={() => void toggle(r.roundId)} aria-expanded={open === r.roundId}>
                        #{r.roundId}
                      </button>{" "}
                      <span className="table__when">{r.closedAt && now ? ago(r.closedAt, now) : ""}</span>
                    </td>
                    <td>◎ {sol(r.claimedLamports, 4)}</td>
                    <td className="up">◎ {sol(r.pouredLamports + r.pouringLamports, 4)}</td>
                    <td>{int(r.cups)}</td>
                    <td>
                      {r.claimSig ? (
                        <a href={links.tx(r.claimSig)} target="_blank" rel="noreferrer" aria-label="Claim transaction on Solscan">
                          tx <ExternalIcon width={12} height={12} style={{ display: "inline" }} />
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                  {open === r.roundId ? (
                    <tr className="table__sub">
                      <td colSpan={5}>
                        <CupList state={cups[r.roundId]} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CupList({ state }: { state: MilkingCup[] | "loading" | "error" | undefined }) {
  if (!state || state === "loading") return <span style={{ color: "var(--muted)" }}>Loading cups…</span>;
  if (state === "error") return <span style={{ color: "var(--red)" }}>Could not load the cups.</span>;
  if (!state.length) return <span style={{ color: "var(--muted)" }}>No cups were big enough to pour this round; they carry over.</span>;
  return (
    <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
      {state.slice(0, 50).map((c, i) => (
        <div key={`${c.wallet}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "var(--font-mono)", fontSize: 13 }}>
          <a href={links.account(c.wallet)} target="_blank" rel="noreferrer">
            {c.wallet.slice(0, 4)}…{c.wallet.slice(-4)}
          </a>
          <span style={{ color: "var(--muted)" }}>{(c.share_bps / 100).toFixed(2)}%</span>
          <span className={c.status === "confirmed" ? "up" : undefined}>◎ {sol(c.amount_lamports, 4)}</span>
          {c.tx_sig ? (
            <a href={links.tx(c.tx_sig)} target="_blank" rel="noreferrer">
              {c.status}
            </a>
          ) : (
            <span>{c.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}
