// Milk Money: 5 reels x 3 rows, 10 lines, a wild cow and a moon scatter that spins the bonus wheel.
// Demo only: credits are play money that live in this browser.
import type { Sym } from "./symbols";

export const REELS = 5;
export const ROWS = 3;
export const BETS = [10, 20, 50, 100, 200, 500];
export const START_CREDITS = 10_000;

const WEIGHTS: [Sym, number][] = [
  ["cow", 3],
  ["bell", 5],
  ["milk", 7],
  ["candle", 9],
  ["clover", 11],
  ["hay", 13],
  ["moon", 3],
];
const TOTAL = WEIGHTS.reduce((a, [, w]) => a + w, 0);

/** Pays per line, as multiples of the line bet, for 3 / 4 / 5 in a row. */
export const PAYS: Record<Exclude<Sym, "moon">, [number, number, number]> = {
  cow: [25, 100, 500],
  bell: [12, 40, 150],
  milk: [8, 25, 80],
  candle: [5, 15, 50],
  clover: [4, 10, 30],
  hay: [3, 8, 20],
};

/** Row index per reel for each line. */
export const LINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
];

export const WHEEL = [
  { id: "mini", label: "MINI", mult: 20, color: "#60a5fa" },
  { id: "minor", label: "MINOR", mult: 50, color: "#c084fc" },
  { id: "mini", label: "MINI", mult: 20, color: "#60a5fa" },
  { id: "major", label: "MAJOR", mult: 150, color: "#fb923c" },
  { id: "mini", label: "MINI", mult: 20, color: "#60a5fa" },
  { id: "minor", label: "MINOR", mult: 50, color: "#c084fc" },
  { id: "mini", label: "MINI", mult: 20, color: "#60a5fa" },
  { id: "grand", label: "GRAND", mult: 1000, color: "#facc15" },
] as const;

const WHEEL_WEIGHTS = [30, 14, 30, 6, 30, 14, 30, 1];

export function pick(rand = Math.random): Sym {
  let r = rand() * TOTAL;
  for (const [s, w] of WEIGHTS) {
    r -= w;
    if (r < 0) return s;
  }
  return "hay";
}

/** grid[reel][row] */
export function spinGrid(rand = Math.random): Sym[][] {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pick(rand)));
}

export interface LineWin {
  line: number;
  sym: Exclude<Sym, "moon">;
  count: number;
  amount: number;
}

export function evaluate(grid: Sym[][], lineBet: number): { wins: LineWin[]; total: number; moons: number } {
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const syms = rows.map((row, reel) => grid[reel][row]);
    if (syms[0] === "moon") return;
    const target = (syms.find((x) => x !== "cow") ?? "cow") as Sym;
    if (target === "moon") {
      // wilds then a moon: pays as wild cows if there are 3+
      let n = 0;
      while (n < REELS && syms[n] === "cow") n++;
      if (n >= 3) wins.push({ line, sym: "cow", count: n, amount: lineBet * PAYS.cow[n - 3] });
      return;
    }
    let count = 0;
    while (count < REELS && (syms[count] === target || syms[count] === "cow")) count++;
    if (count >= 3) {
      const sym = target as Exclude<Sym, "moon">;
      wins.push({ line, sym, count, amount: lineBet * PAYS[sym][count - 3] });
    }
  });
  const moons = grid.flat().filter((x) => x === "moon").length;
  return { wins, total: wins.reduce((a, w) => a + w.amount, 0), moons };
}

export function spinWheel(rand = Math.random): number {
  const total = WHEEL_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < WHEEL_WEIGHTS.length; i++) {
    r -= WHEEL_WEIGHTS[i];
    if (r < 0) return i;
  }
  return 0;
}
