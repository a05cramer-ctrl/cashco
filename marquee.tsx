import { BRAND, sharePct } from "@/brand";

function Bottle() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <path d="M11 3h8v4l3 5v13a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V12l3-5Z" fill="currentColor" opacity=".25" />
      <path d="M11 3h8v4l3 5v13a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V12l3-5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.5 16h13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Marquee({ variant = "dark" }: { variant?: "dark" | "mint" }) {
  const items = [
    "Hold the cow",
    "Drink the milk",
    "Milked every 5 min",
    `${sharePct()} of creator fees to holders`,
    "Paid in SOL",
    "No presale",
    "No team bag",
    `$${BRAND.ticker} on pump.fun`,
  ];
  const row = [...items, ...items];
  return (
    <div className={variant === "mint" ? "marquee marquee--mint" : "marquee"} aria-hidden="true">
      <div className="marquee__track">
        {row.map((t, i) => (
          <span className="marquee__item" key={i}>
            {t}
            <Bottle />
          </span>
        ))}
      </div>
    </div>
  );
}
