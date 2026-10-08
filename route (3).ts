import { dairyEnv } from "@/lib/env.server";
import { edge, errMsg, fail, ok } from "@/lib/http.server";

export const dynamic = "force-dynamic";

// Every cup poured in one milking round.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roundId = Number(id);
  if (!Number.isSafeInteger(roundId) || roundId < 0) return fail("Unknown milking.", 400);
  try {
    const env = await dairyEnv();
    if (!env.DB) return fail("The milking machine is not switched on yet.", 503);
    const [round, cups] = await env.DB.batch([
      env.DB.prepare("SELECT round_id, status, claimed_lamports, pot_lamports, paid_lamports, holders_counted, holders_paid, claim_sig, note, closed_at FROM rounds WHERE round_id = ?").bind(roundId),
      env.DB
        .prepare("SELECT wallet, amount_lamports, share_bps, avg_tokens, status, tx_sig FROM payslips WHERE round_id = ? ORDER BY amount_lamports DESC LIMIT 500")
        .bind(roundId),
    ]);
    if (!round.results?.length) return fail("Unknown milking.", 404);
    return ok({ round: round.results[0], cups: cups.results ?? [] }, edge(15));
  } catch (e) {
    return fail(`Could not read the ledger: ${errMsg(e)}`, 503);
  }
}
