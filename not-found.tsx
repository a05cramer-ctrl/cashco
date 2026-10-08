import Link from "next/link";

import { Cow } from "@/components/cow";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 18, justifyItems: "center" }}>
        <div style={{ width: 180 }}>
          <Cow expression="wow" crop="head" />
        </div>
        <h1 className="h-display" style={{ fontSize: "clamp(40px, 8vw, 80px)" }}>
          This cow wandered off.
        </h1>
        <Link className="btn btn--mint" href="/">
          Back to the pasture
        </Link>
      </div>
    </main>
  );
}
