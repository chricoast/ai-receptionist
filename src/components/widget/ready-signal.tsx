"use client";

import { useEffect } from "react";

/** Tells the bubble script on the website that this page loaded. */
export function ReadySignal() {
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: "air:ready" }, "*");
  }, []);
  return null;
}
