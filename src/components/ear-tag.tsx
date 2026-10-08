"use client";

// The contract address, printed on a cow's ear tag. Copies on click.
import { useState } from "react";

import { BRAND } from "@/brand";
import { short } from "@/lib/format";

export function EarTag({ label = "Ear tag · CA", compact = false }: { label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const mint = BRAND.mint;

  async function copy() {
    if (!mint) return;
    try {
      await navigator.clipboard.writeText(mint);
    } catch {
      const t = document.createElement("textarea");
      t.value = mint;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="eartag">
      <span className="eartag__hole" aria-hidden="true" />
      <span className="eartag__body">
        <span className="eartag__label">{label}</span>
        <span className="eartag__value" title={mint || undefined}>
          {mint ? (compact ? short(mint, 6) : mint) : "Revealed at launch"}
        </span>
      </span>
      <button className="eartag__copy" type="button" onClick={copy} disabled={!mint} aria-label="Copy the contract address">
        {mint ? (copied ? "Copied" : "Copy") : "Soon"}
      </button>
    </div>
  );
}
