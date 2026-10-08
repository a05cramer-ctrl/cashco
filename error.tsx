"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 18, justifyItems: "center" }}>
        <h1 className="h-display" style={{ fontSize: "clamp(36px, 7vw, 72px)" }}>
          Spilled milk.
        </h1>
        <p>Something broke on this page. Try again in a moment.</p>
        <button className="btn btn--mint" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
