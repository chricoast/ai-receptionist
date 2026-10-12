"use client";

import { useState } from "react";
import { buttonClass } from "./ui";

export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the code is still selectable on the page.
        }
      }}
    >
      <span aria-live="polite">{copied ? `✓ ${copiedLabel}` : label}</span>
    </button>
  );
}
