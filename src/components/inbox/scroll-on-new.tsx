"use client";

import { useEffect, useRef } from "react";

/** Scrolls to the newest message when one arrives (not on first load). */
export function ScrollOnNew({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(count);
  useEffect(() => {
    if (count > previous.current) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    previous.current = count;
  }, [count]);
  return <div ref={ref} aria-hidden />;
}
