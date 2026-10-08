import { kvAdd, kvGet } from "@/lib/dairy.server";
import { dairyEnv } from "@/lib/env.server";
import { edge, errMsg, fail, ok } from "@/lib/http.server";

export const dynamic = "force-dynamic";

// The herd's moo counter. Taps are batched by the page; each address gets ~60 moos a minute.
const recent = new Map<string, { at: number; n: number }>();

function allowed(ip: string, n: number, now: number): number {
  const cur = recent.get(ip);
  if (!cur || now - cur.at > 60_000) {
    if (recent.size > 5_000) recent.clear();
    recent.set(ip, { at: now, n });
    return Math.min(n, 60);
  }
  const room = Math.max(0, 60 - cur.n);
  cur.n += n;
  return Math.min(n, room);
}

export async function GET() {
  try {
    const env = await dairyEnv();
    if (!env.DB) return ok({ moos: null }, edge(30));
    return ok({ moos: Number(await kvGet(env.DB, "moos")) || 0 }, edge(3));
  } catch (e) {
    return fail(errMsg(e), 503);
  }
}

export async function POST(request: Request) {
  try {
    const env = await dairyEnv();
    if (!env.DB) return ok({ moos: null });
    let n = 1;
    try {
      const body = (await request.json()) as { n?: unknown };
      n = Math.max(1, Math.min(25, Math.floor(Number(body?.n) || 1)));
    } catch {
      // a bare POST counts as one moo
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const take = allowed(ip, n, Date.now());
    if (take > 0) await kvAdd(env.DB, "moos", take).run();
    return ok({ moos: Number(await kvGet(env.DB, "moos")) || 0 });
  } catch (e) {
    return fail(errMsg(e), 503);
  }
}
