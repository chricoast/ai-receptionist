import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonStyles = {
  // Lime "press me" button from the CostaHub × Máta design.
  primary:
    "border-2 border-ink bg-lime font-semibold text-ink shadow-[0_3px_0_#000] hover:bg-[#b9e61a] active:translate-y-[2px] active:shadow-[0_1px_0_#000] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none",
  dark: "bg-ink font-semibold text-white hover:bg-neutral-800 disabled:opacity-60",
  secondary: "border-2 border-neutral-200 bg-white text-ink hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60",
  ghost: "text-neutral-700 hover:bg-neutral-200/60 hover:text-ink",
  danger: "text-red-700 hover:bg-red-50",
};

export function buttonClass(variant: keyof typeof buttonStyles = "primary", extra?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed",
    buttonStyles[variant],
    extra,
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonStyles }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-ink placeholder:text-neutral-500 focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/50 disabled:bg-neutral-100 disabled:text-neutral-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, className)} {...props} />;
}

export function Field({
  label,
  hint,
  optional,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  optional?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-neutral-500">({optional})</span> : null}
      </label>
      {children}
      {hint ? <p className="text-sm text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl bg-white p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-brand-200 bg-lime-tint text-lime-ink",
    info: "border-neutral-200 bg-white text-neutral-700",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm", styles[tone])}>
      {children}
    </div>
  );
}

/** Small tappable chip used for suggestions. */
export function Chip({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-4 py-2 text-sm text-ink hover:border-ink hover:bg-lime-tint",
        className,
      )}
      {...props}
    />
  );
}

/** Small handwritten note (Shantell Sans), used sparingly for a friendly touch. */
export function HandNote({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("font-hand text-[15px] text-neutral-700", className)}>{children}</p>;
}

/** Coloured status label. */
export function Pill({
  tone = "grey",
  className,
  children,
}: {
  tone?: "grey" | "dark" | "lime" | "pink" | "blue";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    grey: "bg-neutral-100 text-neutral-700",
    dark: "bg-ink text-white",
    lime: "bg-lime-tint text-lime-ink",
    pink: "bg-pink-tint text-pink-ink",
    blue: "bg-blue-tint text-blue-ink",
  };
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
