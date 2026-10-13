import { cn } from "./ui";

/** The receptionist's mark: a tilted lime square with a smile (our logo). */
export function Smiley({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 -rotate-6 place-items-center bg-lime", className)}
      style={{ width: size, height: size, borderRadius: size * 0.34 }}
    >
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 30 30" fill="none" stroke="#000" strokeWidth={2.4} strokeLinecap="round">
        <path d="M9 12.5c.6-1 1.8-1 2.4 0M18.6 12.5c.6-1 1.8-1 2.4 0" />
        <path d="M10 17.5c2.8 3 7.2 3 10 0" />
      </svg>
    </span>
  );
}
