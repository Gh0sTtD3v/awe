"use client";

import { useState } from "react";
import { ClientGameService } from "../../services/client-game-service";
import { EVERYONE_ROLE_ID, type Member } from "../../server/access/types";
import { canManageRole, memberTopPosition, shortSubject, useAccessOverview } from "./use-access-overview";
import { ErrorNote, inputCls, labelCls, MemberName } from "./ui";

/**
 * Who has which roles. Members are added by Privy user id or by Cosmos
 * address; an address entry applies to whoever links that Keplr wallet, so
 * people can be given roles before they ever sign in.
 */
export function MembersTab() {
  const { overview, error, setError, busy, apply } = useAccessOverview();
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  if (!overview) {
    return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-white/40">Loading…</p>;
  }

  const me = overview.me;
  const canManageMembers = me.permissions.includes("manage_members");
  const canBan = me.permissions.includes("ban_members");
  const assignable = overview.roles.filter((r) => r.id !== EVERYONE_ROLE_ID);

  /** Mirrors the server: only members ranked below you, never the owner. */
  const outranks = (m: Member) =>
    me.topPosition === null || memberTopPosition(overview, m.roleIds) < me.topPosition;

  const add = async () => {
    const ok = await apply(() => ClientGameService.addMember({ subject, note: note.trim() || undefined }));
    if (ok) {
      setSubject("");
      setNote("");
    }
  };

  const toggleRole = (m: Member, roleId: string) => {
    const roleIds = m.roleIds.includes(roleId) ? m.roleIds.filter((id) => id !== roleId) : [...m.roleIds, roleId];
    void apply(() => ClientGameService.setMemberRoles(m.subject, roleIds));
  };

  const q = query.trim().toLowerCase();
  const members = overview.members
    .filter(
      (m) =>
        !q ||
        m.subject.toLowerCase().includes(q) ||
        (m.note ?? "").toLowerCase().includes(q) ||
        (overview.profiles?.[m.subject]?.username ?? "").toLowerCase().includes(q),
    )
    .sort((a, b) => memberTopPosition(overview, b.roleIds) - memberTopPosition(overview, a.roleIds));

  return (
    <div className="space-y-4 max-w-3xl">
      {error && <ErrorNote onClose={() => setError(null)}>{error}</ErrorNote>}

      {canManageMembers && (
        <div className="rounded-lg bg-black/30 p-3 space-y-2">
          <label className={labelCls}>Add member</label>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="did:privy:…, cosmos1… or 0x…"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && subject.trim() && void add()}
            />
            <input
              className={inputCls + " max-w-[12rem]"}
              placeholder="Note (optional)"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              onClick={add}
              disabled={busy || !subject.trim()}
              className="shrink-0 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="text-[11px] text-white/30">
            A cosmos address applies to whoever signs in with, or links, that Keplr wallet.
          </p>
        </div>
      )}

      <input
        className={inputCls}
        placeholder="Search members…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-1.5">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
          {overview.ownerId ? (
            <MemberName subject={overview.ownerId} profile={overview.profiles?.[overview.ownerId]} />
          ) : (
            <span className="text-xs text-white/80">No owner set (AWE_OWNER_ID)</span>
          )}
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] text-amber-200">Owner</span>
          <span className="ml-auto text-[11px] text-white/30">Set at world setup</span>
        </div>

        {members.length === 0 && <p className="px-3 py-2 text-xs text-white/40">No members yet.</p>}

        {members.map((m) => {
          const manageable = outranks(m);
          return (
            <div key={m.subject} className={`rounded-lg bg-black/30 px-3 py-2 ${m.banned ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-3">
                <MemberName subject={m.subject} profile={overview.profiles?.[m.subject]} />
                {m.note && <span className="truncate text-xs text-white/40">{m.note}</span>}
                {m.banned && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-200">Banned</span>
                )}
                <div className="ml-auto flex shrink-0 gap-3 text-xs">
                  {canBan && manageable && (
                    <button
                      onClick={() => void apply(() => ClientGameService.setBanned(m.subject, !m.banned))}
                      disabled={busy}
                      className="text-white/60 hover:text-white"
                    >
                      {m.banned ? "Unban" : "Ban"}
                    </button>
                  )}
                  {canManageMembers && manageable && (!m.banned || canBan) && (
                    <button
                      onClick={() => void apply(() => ClientGameService.removeMember(m.subject))}
                      disabled={busy}
                      className="text-red-400/80 hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                  {!manageable && <span className="text-white/30" title="Their highest role isn't below yours">🔒</span>}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {assignable.map((r) => {
                  const has = m.roleIds.includes(r.id);
                  const toggleable = canManageMembers && manageable && canManageRole(overview, r);
                  if (!has && !toggleable) return null;
                  return (
                    <button
                      key={r.id}
                      disabled={!toggleable || busy}
                      onClick={() => toggleRole(m, r.id)}
                      title={toggleable ? (has ? "Remove role" : "Give role") : "You can't change this role"}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                        has ? "border-white/20 bg-white/10 text-white" : "border-dashed border-white/10 text-white/40"
                      } ${toggleable ? "hover:border-white/40" : "cursor-default"}`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
