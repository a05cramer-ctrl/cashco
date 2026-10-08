"use client";

// Polls /api/state and shares the dairy snapshot (plus a server-synced clock) with every section.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { DairySnapshot } from "@/lib/types";

export interface DairyContextValue {
  snapshot: DairySnapshot | null;
  error: string | null;
  serverNow: () => number;
  refresh: () => void;
}

const DairyContext = createContext<DairyContextValue>({
  snapshot: null,
  error: null,
  serverNow: () => Date.now(),
  refresh: () => undefined,
});

export const useDairy = () => useContext(DairyContext);

export function DairyProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DairySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offset = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = (await res.json()) as { now?: number; snapshot?: DairySnapshot; error?: string };
      if (!res.ok || !json.snapshot) throw new Error(json.error ?? "The dairy is not answering.");
      // The CDN may serve a copy a few seconds old: its Age header keeps the countdown honest.
      const age = Number(res.headers.get("age") ?? 0) || 0;
      offset.current = (json.now ?? Date.now()) + age * 1000 - Date.now();
      setSnapshot(json.snapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      timer.current = window.setTimeout(() => void load(), document.hidden ? 30_000 : 10_000);
    }
  }, []);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const value = useMemo<DairyContextValue>(
    () => ({ snapshot, error, serverNow: () => Date.now() + offset.current, refresh: () => void load() }),
    [snapshot, error, load],
  );

  return <DairyContext.Provider value={value}>{children}</DairyContext.Provider>;
}

/** Re-renders every `ms` so countdowns tick. Null until mounted (keeps server HTML stable). */
export function useNow(ms = 1000): number | null {
  const { serverNow } = useDairy();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(serverNow());
    const id = window.setInterval(() => setNow(serverNow()), ms);
    return () => window.clearInterval(id);
  }, [ms, serverNow]);
  return now;
}
