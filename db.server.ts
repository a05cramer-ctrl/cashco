// Turso (libSQL) behind a small D1-style interface (prepare / bind / first / all / run / batch).
import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";

import { SCHEMA } from "./schema";

export interface Stmt {
  readonly sql: string;
  readonly args: InValue[];
  bind(...args: unknown[]): Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface Db {
  prepare(sql: string): Stmt;
  batch(stmts: Stmt[]): Promise<{ results: unknown[] }[]>;
}

const rowsOf = (rs: ResultSet) => rs.rows.map((row) => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])));

class LibsqlStmt implements Stmt {
  constructor(
    private readonly client: Client,
    readonly sql: string,
    readonly args: InValue[] = [],
  ) {}

  bind(...args: unknown[]): Stmt {
    return new LibsqlStmt(this.client, this.sql, args as InValue[]);
  }

  async first<T>(): Promise<T | null> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args });
    return (rowsOf(rs)[0] as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args });
    return { results: rowsOf(rs) as T[] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args });
    return { meta: { changes: rs.rowsAffected } };
  }
}

export function wrapClient(client: Client): Db {
  return {
    prepare: (sql) => new LibsqlStmt(client, sql),
    batch: async (stmts) =>
      (await client.batch(stmts.map((s) => ({ sql: s.sql, args: s.args as InValue[] })), "write")).map((rs) => ({ results: rowsOf(rs) })),
  };
}

let client: Client | null = null;
let ready: Promise<void> | null = null;

/** The dairy's database, with its tables created on first use. Null until TURSO_DATABASE_URL is set. */
export async function getDb(): Promise<Db | null> {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return null;
  client ??= createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  ready ??= client.executeMultiple(SCHEMA).catch((e: unknown) => {
    ready = null;
    throw e;
  });
  await ready;
  return wrapClient(client);
}
