import Link from "next/link";
import { APP_NAME } from "@/config/app";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-stone-900">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">
        AI
      </span>
      <span>{APP_NAME}</span>
    </Link>
  );
}
