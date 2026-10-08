// Minimal Solana wire-format toolkit (no web3.js): keys, PDAs, and raw transaction
// parsing, signing and building.
import bs58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

import { PROGRAMS } from "./config";

const enc = new TextEncoder();

export const b58encode = (bytes: Uint8Array) => bs58.encode(bytes);
export const b58decode = (text: string) => bs58.decode(text);

export function isPubkey(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  try {
    return bs58.decode(value).length === 32;
  } catch {
    return false;
  }
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let size = 0;
  for (const p of parts) size += p.length;
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// compact-u16 ("shortvec") length prefix
export function encodeLength(n: number): number[] {
  const out: number[] = [];
  let rem = n;
  for (;;) {
    let elem = rem & 0x7f;
    rem >>= 7;
    if (rem === 0) {
      out.push(elem);
      return out;
    }
    elem |= 0x80;
    out.push(elem);
  }
}

export function decodeLength(bytes: Uint8Array, offset: number): [number, number] {
  let len = 0;
  let size = 0;
  for (;;) {
    const elem = bytes[offset + size];
    len |= (elem & 0x7f) << (size * 7);
    size += 1;
    if ((elem & 0x80) === 0) return [len, size];
    if (size > 3) throw new Error("bad shortvec");
  }
}

type PointCtor = { fromHex(hex: Uint8Array): unknown };
const curvePoint: PointCtor =
  (ed25519 as unknown as { Point?: PointCtor; ExtendedPoint: PointCtor }).Point ??
  (ed25519 as unknown as { ExtendedPoint: PointCtor }).ExtendedPoint;

export function isOnCurve(bytes: Uint8Array): boolean {
  try {
    curvePoint.fromHex(bytes);
    return true;
  } catch {
    return false;
  }
}

export const seedBytes = (s: string) => enc.encode(s);

export function findProgramAddress(seeds: Uint8Array[], programId: string): [string, number] {
  const pid = bs58.decode(programId);
  const marker = enc.encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(concatBytes(...seeds, Uint8Array.of(bump), pid, marker));
    if (!isOnCurve(hash)) return [bs58.encode(hash), bump];
  }
  throw new Error("no viable bump seed");
}

export const bondingCurveAddress = (mint: string) =>
  findProgramAddress([seedBytes("bonding-curve"), bs58.decode(mint)], PROGRAMS.pump)[0];
export const pumpCreatorVault = (creator: string) =>
  findProgramAddress([seedBytes("creator-vault"), bs58.decode(creator)], PROGRAMS.pump)[0];
export const ammCreatorVaultAuthority = (creator: string) =>
  findProgramAddress([seedBytes("creator_vault"), bs58.decode(creator)], PROGRAMS.pumpAmm)[0];
export const associatedTokenAddress = (owner: string, mint: string, tokenProgram: string = PROGRAMS.token) =>
  findProgramAddress([bs58.decode(owner), bs58.decode(tokenProgram), bs58.decode(mint)], PROGRAMS.ata)[0];

export interface ParsedTx {
  bytes: Uint8Array;
  sigCount: number;
  sigStart: number;
  message: Uint8Array;
  version: "legacy" | 0;
  numRequiredSignatures: number;
  staticKeys: string[];
}

export function parseTransaction(bytes: Uint8Array): ParsedTx {
  const [sigCount, sigLenSize] = decodeLength(bytes, 0);
  const sigStart = sigLenSize;
  const message = bytes.subarray(sigStart + sigCount * 64);
  let o = 0;
  let version: "legacy" | 0 = "legacy";
  if (message[0] & 0x80) {
    if ((message[0] & 0x7f) !== 0) throw new Error("unsupported transaction version");
    version = 0;
    o = 1;
  }
  const numRequiredSignatures = message[o];
  o += 3;
  const [numKeys, ks] = decodeLength(message, o);
  o += ks;
  const staticKeys: string[] = [];
  for (let i = 0; i < numKeys; i++) {
    staticKeys.push(bs58.encode(message.subarray(o, o + 32)));
    o += 32;
  }
  if (sigCount !== numRequiredSignatures) throw new Error("signature count mismatch");
  return { bytes, sigCount, sigStart, message, version, numRequiredSignatures, staticKeys };
}

export function signerIndex(tx: ParsedTx, pubkey: string): number {
  const i = tx.staticKeys.indexOf(pubkey);
  return i >= 0 && i < tx.numRequiredSignatures ? i : -1;
}

export function signatureAt(tx: ParsedTx, index: number): Uint8Array {
  const start = tx.sigStart + index * 64;
  return tx.bytes.subarray(start, start + 64);
}

export function isSignedBy(tx: ParsedTx, pubkey: string): boolean {
  const i = signerIndex(tx, pubkey);
  if (i < 0) return false;
  const sig = signatureAt(tx, i);
  if (!sig.some((b) => b !== 0)) return false;
  return ed25519.verify(sig, tx.message, bs58.decode(pubkey));
}

export function publicKeyFromSeed(seed32: Uint8Array): string {
  return bs58.encode(ed25519.getPublicKey(seed32));
}

/** Adds this key's signature to a serialized transaction and returns new bytes. */
export function signTransactionBytes(bytes: Uint8Array, seed32: Uint8Array): Uint8Array {
  const tx = parseTransaction(bytes);
  const idx = signerIndex(tx, publicKeyFromSeed(seed32));
  if (idx < 0) throw new Error("this key is not a signer of the transaction");
  const sig = ed25519.sign(tx.message, seed32);
  const out = bytes.slice();
  out.set(sig, tx.sigStart + idx * 64);
  return out;
}

export function transactionId(bytes: Uint8Array): string {
  const tx = parseTransaction(bytes);
  return bs58.encode(signatureAt(tx, 0));
}

export function newKeypair(): { seed: Uint8Array; publicKey: string } {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return { seed, publicKey: publicKeyFromSeed(seed) };
}

/** Accepts a base58 64-byte secret key (Phantom export) or a JSON byte array (solana-keygen). */
export function keypairFromSecret(secret: string): { seed: Uint8Array; publicKey: string } {
  const text = secret.trim();
  const bytes = text.startsWith("[") ? Uint8Array.from(JSON.parse(text) as number[]) : bs58.decode(text);
  if (bytes.length !== 64 && bytes.length !== 32) throw new Error("secret key must be 32 or 64 bytes");
  const seed = bytes.slice(0, 32);
  const publicKey = publicKeyFromSeed(seed);
  if (bytes.length === 64 && bs58.encode(bytes.slice(32)) !== publicKey) {
    throw new Error("secret key does not match its public key");
  }
  return { seed, publicKey };
}

const u32le = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};
const u64le = (n: bigint) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
};

function instruction(programIdx: number, accounts: number[], data: Uint8Array): Uint8Array {
  return concatBytes(
    Uint8Array.of(programIdx),
    Uint8Array.from(encodeLength(accounts.length)),
    Uint8Array.from(accounts),
    Uint8Array.from(encodeLength(data.length)),
    data,
  );
}

/** Legacy transaction: compute budget + one SOL transfer per recipient, signed by the payer. */
export function buildTransferTransaction(opts: {
  payerSeed: Uint8Array;
  recentBlockhash: string;
  transfers: { to: string; lamports: bigint }[];
  microLamportsPerCu?: number;
}): Uint8Array {
  const payer = publicKeyFromSeed(opts.payerSeed);
  const recipients = opts.transfers.map((t) => t.to);
  if (new Set(recipients).size !== recipients.length) throw new Error("duplicate recipient");
  if (recipients.includes(payer)) throw new Error("payer cannot pay itself");
  const keys = [payer, ...recipients, PROGRAMS.system, PROGRAMS.computeBudget];
  const systemIdx = keys.length - 2;
  const budgetIdx = keys.length - 1;
  const ixs: Uint8Array[] = [
    instruction(budgetIdx, [], concatBytes(Uint8Array.of(2), u32le(1000 + 450 * recipients.length))),
    instruction(budgetIdx, [], concatBytes(Uint8Array.of(3), u64le(BigInt(opts.microLamportsPerCu ?? 50_000)))),
    ...opts.transfers.map((t, i) =>
      instruction(systemIdx, [0, i + 1], concatBytes(u32le(2), u64le(t.lamports))),
    ),
  ];
  const message = concatBytes(
    Uint8Array.of(1, 0, 2),
    Uint8Array.from(encodeLength(keys.length)),
    ...keys.map((k) => bs58.decode(k)),
    bs58.decode(opts.recentBlockhash),
    Uint8Array.from(encodeLength(ixs.length)),
    ...ixs,
  );
  const signature = ed25519.sign(message, opts.payerSeed);
  const tx = concatBytes(Uint8Array.from(encodeLength(1)), signature, message);
  if (tx.length > 1232) throw new Error("transaction too large");
  return tx;
}
