// Small helpers shared by the API routes.
export const fail = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export const ok = (body: unknown, cache = "no-store") => Response.json(body, { headers: { "cache-control": cache } });

/** Cached at Vercel's edge for `s` seconds, then served stale while one request refreshes it. */
export const edge = (s: number) => `public, max-age=0, s-maxage=${s}, stale-while-revalidate=${s * 4}`;

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 180);
