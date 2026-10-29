"use client";

import React from "react";

export const inputCls =
  "w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:opacity-50";
export const labelCls = "block text-xs uppercase tracking-wide text-white/40 mb-1";

/** A member: profile picture and username when they made a profile, else their id. */
export function MemberName({
  subject,
  profile,
}: {
  subject: string;
  profile?: { username: string | null; avatarUrl: string | null };
}) {
  const name = profile?.username;
  const short = subject.length <= 22 ? subject : `${subject.slice(0, 12)}…${subject.slice(-6)}`;
  return (
    <span className="flex min-w-0 items-center gap-2" title={subject}>
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
          {(name ?? subject.replace(/^did:privy:|^cosmos1|^0x/, "")).charAt(0).toUpperCase()}
        </span>
      )}
      {name ? (
        <span className="truncate text-sm text-white/90">{name}</span>
      ) : (
        <span className="truncate font-mono text-xs text-white/80">{short}</span>
      )}
    </span>
  );
}

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
