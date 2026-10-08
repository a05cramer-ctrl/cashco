import { runTickIfDue } from "@/lib/dairy.server";
import { dairyEnv } from "@/lib/env.server";
import { fail, ok } from "@/lib/http.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The dairy's clock. Hit it once a minute (cron-job.org on Hobby, Vercel Cron on Pro) with
// "Authorization: Bearer <CRON_SECRET>" or "?secret=<CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) return fail("Unauthorized.", 401);
  const started = Date.now();
  const result = await runTickIfDue(await dairyEnv());
  return ok({ ...result, ms: Date.now() - started });
}
