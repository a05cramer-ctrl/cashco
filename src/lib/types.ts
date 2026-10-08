// Shapes shared by the server (snapshot writer, API routes) and the browser.

export interface Market {
  mint: string | null;
  mcapSol: number | null;
  mcapUsd: number | null;
  /** pump.fun bonding-curve progress, 0-100. */
  curvePct: number | null;
  bonded: boolean;
  creator: string | null;
  solUsd: number | null;
  at: number;
}

export interface LedgerEntry {
  roundId: number;
  claimedLamports: number;
  potLamports: number;
  pouredLamports: number;
  pouringLamports: number;
  cups: number;
  holdersCounted: number;
  claimSig: string | null;
  note: string | null;
  closedAt: number | null;
}

export interface DairySnapshot {
  generatedAt: number;
  roundId: number;
  roundEndsAt: number;
  milkingMs: number;
  tickMs: number;
  config: { db: boolean; rpc: boolean; treasury: boolean; mint: boolean; milking: boolean; shareBps: number; minHoldTokens: number };
  coin: Market | null;
  solUsd: number | null;
  bucket: { claimableLamports: number | null; rolloverLamports: number };
  herd: { holders: number | null; eligible: number | null; sampledAt: number | null; samplesThisRound: number };
  totals: { pouredLamports: number; payouts: number; roundsPaid: number };
  /** The paying wallet, and what it currently owes the herd (rollover + saved-up cups + cups in flight). */
  treasury: { address: string | null; liabilitiesLamports: number };
  ledger: LedgerEntry[];
  lastRound: { roundId: number; status: string; note: string | null; closedAt: number | null } | null;
  moos: number;
}

export interface CupView {
  wallet: string;
  roundId: number;
  samples: number;
  inHerd: boolean;
  latestTokens: number | null;
  avgTokens: number;
  sharePct: number;
  estimatedLamports: number;
  receivedLamports: number;
  roundsPaid: number;
  owedLamports: number;
  recent: { roundId: number; amountLamports: number; status: string; txSig: string | null; at: number }[];
}

export interface MilkingCup {
  wallet: string;
  amount_lamports: number;
  share_bps: number;
  avg_tokens: number;
  status: string;
  tx_sig: string | null;
}
