"use client";

import React from "react";

export const inputCls =
  "w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:opacity-50";
export const labelCls = "block text-xs uppercase tracking-wide text-white/40 mb-1";

export function ErrorNote({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="text-red-200/60 hover:text-red-100">
          ✕
        </button>
      )}
    </div>
  );
}
