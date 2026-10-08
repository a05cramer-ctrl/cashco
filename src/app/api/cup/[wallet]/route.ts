import { cupFor } from "@/lib/dairy.server";
import { dairyEnv } from "@/lib/env.server";
import { edge, errMsg, fail, ok } from "@/lib/http.server";
import { isPubkey } from "@/lib/solana";

export const dynamic = "force-dynamic";

// "Check your cup": a wallet's place in this round's herd, its estimated cup and its milk so far.
export async function GET(_request: Request, { params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;
  if (!isPubkey(wallet)) return fail("That is not a Solana wallet address.", 400);
  try {
    const env = await dairyEnv();
    if (!env.DB) return fail("The milking machine is not switched on yet.", 503);
    return ok(await cupFor(env, env.DB, wallet), edge(10));
  } catch (e) {
    return fail(`Could not read the herd: ${errMsg(e)}`, 503);
  }
}
