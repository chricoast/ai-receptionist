import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { Smiley } from "./smiley";

export function Logo({ href = "/", title = APP_NAME, subtitle }: { href?: string; title?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5 text-ink">
      <Smiley size={38} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[17px] font-extrabold tracking-tight">{title}</span>
        {subtitle ? <span className="truncate text-xs text-neutral-600">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
