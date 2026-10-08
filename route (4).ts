import { after } from "next/server";

import { TICK_MS } from "@/lib/config";
import { liteSnapshot, runTickIfDue, writeSnapshot } from "@/lib/dairy.server";
import { dairyEnv } from "@/lib/env.server";
import { edge, errMsg, fail } from "@/lib/http.server";

export const dynamic = "force-dynamic";

// Public dairy state: the snapshot the clock writes every tick, plus the server clock.
export async function GET() {
  try {
    const env = await dairyEnv();
    const now = Date.now();
    const db = env.DB;
    if (!db) {
      // No database yet: live market data only, cached at the edge.
      return new Response(JSON.stringify({ now, snapshot: await liteSnapshot(env, now) }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": edge(15) },
      });
    }
    let row = await db.prepare("SELECT v, updated_at FROM kv WHERE k = 'snapshot'").first<{ v: string; updated_at: number }>();
    if (!row || now - Number(row.updated_at) > 2 * TICK_MS) {
      // The pinger looks late: let this visit nudge the clock after the response is sent.
      after(() => runTickIfDue(env).catch(() => undefined));
      if (!row) row = { v: await writeSnapshot(env, db, now), updated_at: now };
    }
    return new Response(`{"now":${now},"snapshot":${row.v}}`, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": edge(5) },
    });
  } catch (e) {
    return fail(`The dairy is closed for a moment: ${errMsg(e)}`, 503);
  }
}
