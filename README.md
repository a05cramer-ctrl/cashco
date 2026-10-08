# Cash Cow ($CASHCOW)

**The cow that pays you to hold it.** A pump.fun memecoin site with a working milking machine: every 5 minutes it claims the coin's pump.fun creator fees and pours them to holders in SOL, split by how much each wallet held during the round.

Next.js 16 on Vercel (Hobby works), Turso for the ledger, a once-a-minute pinger for the clock. No web3.js: transactions are built and signed from raw bytes.

What's on the page:

- a tappable cow that follows your cursor, moos (synthesized, no audio files) and counts moos for the whole herd
- the live milking machine: countdown, unclaimed fees, total poured, herd size, market cap, bonding-curve progress, a wallet lookup ("check your cup") and an on-chain ledger
- **Milk Money**, a playable demo slot (play credits only, nothing to win) for the "casino coming soon" teaser
- thesis, pump.fun spec sheet, a yield board, the cattle-passport tokenomics, how to buy, community

Everything that names the coin lives in [`src/brand.ts`](src/brand.ts). Colours are pump.fun's: `#0b0b0e`, mint `#86efac`, the sprout greens, and their blue / orange / pink / purple accents ([`src/styles/site.css`](src/styles/site.css)).

## 1. Deploy (two minutes, no keys)

1. On [vercel.com](https://vercel.com/new): **Add New → Project → Import** this repo → **Deploy**.
2. Settings → Environment Variables: add `NEXT_PUBLIC_X_URL` and `NEXT_PUBLIC_TELEGRAM_URL`, then **Redeploy**.

The site works right away as a landing page ("Revealed at launch" on the CA, "launching on pump.fun").

## 2. Launch the coin

1. Make a **fresh wallet** just for the coin (this becomes the treasury). Import it into Phantom and fund it with the SOL for your dev buy plus ~0.05 SOL.
2. On pump.fun, create the coin from that wallet:
   - name `Cash Cow`, ticker `CASHCOW`, image [`public/brand/pfp-512.png`](public/brand/pfp-512.png)
   - website: your Vercel URL; X / Telegram: your links
   - pair it with **SOL**, not USDC: pump.fun pays fees in the pool's quote asset, and the milking pours SOL
   - leave **Mayhem mode** off (it mints a second billion tokens) and don't set up **fee sharing**: the launch wallet has to receive all of the creator fees
3. Copy the CA into `NEXT_PUBLIC_COIN_MINT` on Vercel (optionally `NEXT_PUBLIC_LAUNCH_DATE`) → **Redeploy**.

For X: profile picture [`public/brand/pfp-512.png`](public/brand/pfp-512.png), header [`public/brand/x-header.jpg`](public/brand/x-header.jpg) (1500×500).

## 3. Turn on the milking machine

| Variable | What to put |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Vercel → Storage → **Marketplace → Turso** → create and connect to this project (adds both). Tables create themselves. |
| `RPC_URL` | A Solana RPC that allows `getProgramAccounts`. A free [Helius](https://www.helius.dev) key is enough: `https://mainnet.helius-rpc.com/?api-key=…` |
| `TREASURY_SECRET_KEY` | The private key of the wallet that launched the coin (Phantom → Settings → Manage accounts → Show private key). |
| `CRON_SECRET` | Any long random string. |
| `MILKING_ENABLED` | `true` (anything else pauses claims and payouts; the site keeps working). |
| `MIN_HOLD_TOKENS` | Optional, default `100000`. |
| `EXCLUDE_WALLETS` | Optional, comma-separated wallets that never get milk (exchange or team wallets). |

**Redeploy**, then start the clock: on [cron-job.org](https://cron-job.org) create a job

- URL: `https://YOUR-SITE/api/cron/tick`
- schedule: every 1 minute
- Advanced → Headers: `Authorization: Bearer YOUR_CRON_SECRET`

Check `https://YOUR-SITE/api/state`: every flag under `config` should be `true` and `herd.eligible` should count your holders within a minute or two. (On Vercel Pro you can use a Vercel Cron instead: `{"crons":[{"path":"/api/cron/tick","schedule":"* * * * *"}]}` in `vercel.json`.)

## How the milk is split

- **Herd counts.** Every minute the clock reads every $CASHCOW token account. Wallets holding at least `MIN_HOLD_TOKENS` are counted. Program-owned accounts (the bonding curve, PumpSwap pools, lockers) are skipped automatically, and so are the treasury and `EXCLUDE_WALLETS`.
- **Rounds.** A round is 5 minutes, so about 5 counts. Your weight is your **average** balance across the round's counts, so buying right before the milking earns a sip, not a bucket.
- **How much milk.** pump.fun's creator fee is 0.30% of every trade on the bonding curve, so about 0.24% of volume reaches holders at the default 80%. After graduation the PumpSwap creator fee is tiered by market cap (up to 0.95%). The current schedule is at [pump.fun/docs/fees](https://pump.fun/docs/fees).
- **Milking.** When a round ends, the treasury claims all pump.fun creator fees (PumpPortal `collectCreatorFee`). The pot is `NEXT_PUBLIC_MILK_SHARE_BPS` (default 80%) of what actually landed, plus any rounding left over from earlier rounds.
- **Pouring.** Cups of 0.001 SOL or more are sent, 16 wallets per transaction, up to 30 transactions a minute. Smaller cups are saved up and added to that wallet's next cup. A payout that fails is credited back and retried next round.
- **Nothing waits on the chain.** A claim or payout sent on one tick is confirmed on the next, so each tick takes a few seconds.

The other 20% stays in the treasury for you (marketing, gas, the casino). Before withdrawing, check `treasury.liabilitiesLamports` in `/api/state`: that is what the treasury still owes holders. Safe to withdraw = balance − 0.01 SOL − liabilities.

### Costs and limits

- Solana fees: about 0.000006 SOL per 16 cups, plus one claim per round.
- Helius free tier: one `getProgramAccounts` a minute is ~45k calls a month, well inside the free credits for a coin with a few thousand holders.
- Turso free tier: a few rows per tick; payouts add one row per cup.

### Safety

`TREASURY_SECRET_KEY` is a hot key on a server. Keep only what the treasury needs in that wallet, never reuse it, and set `MILKING_ENABLED=false` to stop all claims and payouts instantly. Paying holders from fees can raise securities questions in some places, so check before you switch it on.

## Run it locally

```bash
npm install
cp .env.example .env.local   # TURSO_DATABASE_URL=file:local.db works for a local ledger
npm run dev
bun test                      # milking simulation against a fake chain
```

## Layout

```
src/brand.ts                 name, ticker, links, fee share
src/lib/dairy.server.ts      the clock: herd counts, claims, splits, payouts, snapshot
src/lib/pump.server.ts       bonding curve, PumpPortal claim, DexScreener prices
src/lib/solana.ts            keys, PDAs, raw transaction build/sign
src/app/api/*                state, cron/tick, cup/[wallet], milking/[id], moo
src/components/*             the page (cow, milk machine, slot, sections)
test/dairy.test.ts           end-to-end milking simulation
```
