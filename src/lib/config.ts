// Rules of the dairy, shared by the browser and the server. Change numbers here only.

/** One milking round. Creator fees are claimed and poured to holders at the end of each. */
export const MILKING_MS = 5 * 60 * 1000;
/** The clock: one tick a minute (cron-job.org on Vercel Hobby). Holders are sampled every tick. */
export const TICK_MS = 60 * 1000;

export const LAMPORTS_PER_SOL = 1_000_000_000;
/** Cups smaller than this are not sent; they accrue to the holder's next milking. */
export const MIN_PAYOUT_LAMPORTS = 1_000_000; // 0.001 SOL
/** Creator fees below this are left in the vault until the next round. */
export const MIN_CLAIM_LAMPORTS = 2_000_000;
/** SOL the treasury always keeps for transaction fees. */
export const TREASURY_RESERVE_LAMPORTS = 10_000_000;
/** Allocations below this are too small to track; they roll over into the next pot. */
export const DUST_LAMPORTS = 1_000;
/** Transfers per payout transaction (fits comfortably under the 1232-byte limit). */
export const PAYOUTS_PER_TX = 16;
/** Payout transactions sent per tick, so one tick never outlives the 60 s function limit. */
export const MAX_PAYOUT_TXS_PER_TICK = 30;

export const roundIdAt = (ms: number) => Math.floor(ms / MILKING_MS);
export const roundStartMs = (id: number) => id * MILKING_MS;
export const roundEndMs = (id: number) => (id + 1) * MILKING_MS;

export const PROGRAMS = {
  pump: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  pumpAmm: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  token2022: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  ata: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  system: "11111111111111111111111111111111",
  computeBudget: "ComputeBudget111111111111111111111111111111",
} as const;

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

/** pump.fun coins: 1B supply, 6 decimals, 793.1M tokens sold on the bonding curve. */
export const PUMP_DECIMALS = 6;
export const PUMP_SUPPLY_TOKENS = 1_000_000_000;
export const PUMP_CURVE_TOKENS = 793_100_000;
