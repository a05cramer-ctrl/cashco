// Tiny Solana JSON-RPC client over fetch.
import { toBase64 } from "./solana";

export interface RpcAccount {
  data: [string, string];
  owner: string;
  lamports: number;
}

export interface RpcSignatureStatus {
  confirmationStatus?: "processed" | "confirmed" | "finalized";
  err: unknown;
}

export interface RpcTransaction {
  meta: { err: unknown; fee: number; preBalances: number[]; postBalances: number[] } | null;
  transaction: { message: { accountKeys: (string | { pubkey: string })[] } };
}

export interface RpcProgramAccount {
  pubkey: string;
  account: RpcAccount;
}

export const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export class Rpc {
  constructor(readonly url: string) {}

  async call<T>(method: string, params: unknown[], timeoutMs = 20_000): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`rpc ${method}: http ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message?: string } };
    if (json.error) throw new Error(`rpc ${method}: ${json.error.message ?? "error"}`);
    return json.result as T;
  }

  async getAccount(key: string): Promise<RpcAccount | null> {
    const r = await this.call<{ value: RpcAccount | null }>("getAccountInfo", [key, { encoding: "base64", commitment: "confirmed" }]);
    return r.value;
  }

  async getMultipleAccounts(keys: string[]): Promise<(RpcAccount | null)[]> {
    const out: (RpcAccount | null)[] = [];
    for (let i = 0; i < keys.length; i += 100) {
      const r = await this.call<{ value: (RpcAccount | null)[] }>("getMultipleAccounts", [
        keys.slice(i, i + 100),
        { encoding: "base64", commitment: "confirmed" },
      ]);
      out.push(...r.value);
    }
    return out;
  }

  /** Every token account of a mint, sliced down to owner (32 bytes) + amount (8 bytes). */
  async getTokenHolders(tokenProgram: string, mint: string, splLayout: boolean): Promise<RpcProgramAccount[]> {
    const filters: unknown[] = [{ memcmp: { offset: 0, bytes: mint } }];
    if (splLayout) filters.push({ dataSize: 165 });
    return this.call<RpcProgramAccount[]>(
      "getProgramAccounts",
      [tokenProgram, { encoding: "base64", commitment: "confirmed", filters, dataSlice: { offset: 32, length: 40 } }],
      45_000,
    );
  }

  async getBalance(key: string): Promise<number> {
    return (await this.call<{ value: number }>("getBalance", [key, { commitment: "confirmed" }])).value;
  }

  async getTokenBalance(key: string): Promise<number> {
    try {
      const r = await this.call<{ value: { amount: string } }>("getTokenAccountBalance", [key, { commitment: "confirmed" }]);
      return Number(r.value.amount);
    } catch {
      return 0;
    }
  }

  async getLatestBlockhash(): Promise<string> {
    return (await this.call<{ value: { blockhash: string } }>("getLatestBlockhash", [{ commitment: "confirmed" }])).value.blockhash;
  }

  async sendTransaction(bytes: Uint8Array, skipPreflight = false): Promise<string> {
    return this.call<string>("sendTransaction", [
      toBase64(bytes),
      { encoding: "base64", skipPreflight, preflightCommitment: "confirmed", maxRetries: 4 },
    ]);
  }

  async getSignatureStatuses(sigs: string[]): Promise<(RpcSignatureStatus | null)[]> {
    const out: (RpcSignatureStatus | null)[] = [];
    for (let i = 0; i < sigs.length; i += 200) {
      const r = await this.call<{ value: (RpcSignatureStatus | null)[] }>("getSignatureStatuses", [
        sigs.slice(i, i + 200),
        { searchTransactionHistory: true },
      ]);
      out.push(...r.value);
    }
    return out;
  }

  async getTransaction(sig: string): Promise<RpcTransaction | null> {
    return this.call<RpcTransaction | null>("getTransaction", [
      sig,
      { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
    ]);
  }
}

/** SOL balance change of `account` in a confirmed transaction, fee added back for the fee payer. */
export async function lamportDelta(rpc: Rpc, sig: string, account: string): Promise<number> {
  const tx = await rpc.getTransaction(sig);
  if (!tx?.meta || tx.meta.err) return 0;
  const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === "string" ? k : k.pubkey));
  const i = keys.indexOf(account);
  if (i < 0) return 0;
  return tx.meta.postBalances[i] - tx.meta.preBalances[i] + (i === 0 ? tx.meta.fee : 0);
}
