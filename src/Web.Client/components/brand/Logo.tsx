import { cn } from "@/lib/utils";
import { COINS_CIRCLE, COINS_PATHS } from "./brandMark";

const SIZES = {
  sm: { tile: "size-6 rounded-lg", glyph: "size-3.5" },
  md: { tile: "size-9 rounded-xl", glyph: "size-5" },
  lg: { tile: "size-14 rounded-2xl", glyph: "size-7" },
} as const;

type LogoSize = keyof typeof SIZES;

/** The gradient tile + Coins mark, shared by every branded surface. */
export function LogoMark({ size = "md", className }: { size?: LogoSize; className?: string }) {
  const { tile, glyph } = SIZES[size];

  return (
    <div
      className={cn(
        "hero-gradient flex items-center justify-center text-white shadow-lg shadow-emerald-600/25",
        tile,
        className,
      )}
    >
      <svg
        className={cn(glyph)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {COINS_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx={COINS_CIRCLE.cx} cy={COINS_CIRCLE.cy} r={COINS_CIRCLE.r} />
      </svg>
    </div>
  );
}

/** The brand mark plus the "Tydee" wordmark, as used in every header. */
export function Logo({
  size = "md",
  showMark = true,
  className,
}: {
  size?: LogoSize;
  showMark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {showMark && <LogoMark size={size} />}
      <span className="text-xl font-bold tracking-tight text-primary">Tydee</span>
    </span>
  );
}