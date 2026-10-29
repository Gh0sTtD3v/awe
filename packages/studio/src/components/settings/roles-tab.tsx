"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientGameService } from "../../services/client-game-service";
import { PERMISSIONS } from "../../server/access/permissions";
import { EVERYONE_ROLE_ID, type Role } from "../../server/access/types";
import { canManageRole, memberTopPosition, useAccessOverview } from "./use-access-overview";
import { ErrorNote, inputCls, labelCls, MemberName } from "./ui";

const CATEGORIES = [...new Set(PERMISSIONS.map((p) => p.category))];

/**
 * The owner isn't a stored role (it's whoever `AWE_OWNER_ID` names), but it
 * sits above every role, so the list shows it on top, read-only.
 */
const OWNER_ID = "__owner";
const OWNER_ROLE: Role = {
  id: OWNER_ID,
  name: "Owner",
  color: "#f5c542",
  position: Number.POSITIVE_INFINITY,
  permissions: Object.fromEntries(PERMISSIONS.map((p) => [p.id, true])),
};

/**
 * Discord-style role editor: drag to reorder, create and delete, name, colour
 * and per-role permissions. Roles at or above your own highest role are
 * read-only; permissions you don't hold can't be toggled.
 */
export function RolesTab() {
  const { overview, error, setError, busy, apply } = useAccessOverview();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Role | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const roles = overview?.roles ?? [];
  const isOwnerRole = selectedId === OWNER_ID;
  const selected = isOwnerRole ? OWNER_ROLE : (roles.find((r) => r.id === selectedId) ?? null);

  useEffect(() => {
    if (!selectedId && roles.length) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  // Start each edit from what the server has.
  useEffect(() => {
    setDraft(selected ? { ...selected, permissions: { ...selected.permissions } } : null);
  }, [selected]);

  const dirty = useMemo(() => {
    if (!draft || !selected) return false;
    return (
      draft.name !== selected.name ||
      draft.color !== selected.color ||
      PERMISSIONS.some((p) => !!draft.permissions[p.id] !== !!selected.permissions[p.id])
    );
  }, [draft, selected]);

  if (!overview) {
    return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-white/40">Loading…</p>;
  }

  const me = overview.me;
  const editable = !!selected && !isOwnerRole && canManageRole(overview, selected);
  const ranked = roles.filter((r) => r.id !== EVERYONE_ROLE_ID);

  // Members column. Mirrors the server: you can only hand out or take away
  // roles below yours, from members ranked below you.
  const canAssign = !!selected && me.permissions.includes("manage_members") && editable;
  const outranks = (roleIds: string[]) => me.topPosition === null || memberTopPosition(overview, roleIds) < me.topPosition;
  const withRole = selected ? overview.members.filter((m) => m.roleIds.includes(selected.id)) : [];
  const withoutRole = selected ? overview.members.filter((m) => !m.roleIds.includes(selected.id) && outranks(m.roleIds)) : [];
  const nameOf = (subject: string) => overview.profiles?.[subject]?.username ?? subject;
  const setHasRole = (subject: string, roleIds: string[], has: boolean) => {
    if (!selected) return;
    const next = has ? [...roleIds, selected.id] : roleIds.filter((id) => id !== selected.id);
    void apply(() => ClientGameService.setMemberRoles(subject, next));
  };

  const createRole = async () => {
    const before = new Set(roles.map((r) => r.id));
    const next = await apply(() => ClientGameService.createRole({}));
    const created = next?.roles.find((r) => !before.has(r.id));
    if (created) setSelectedId(created.id);
  };

  const save = () => {
    if (!draft) return;
    void apply(() =>
      ClientGameService.updateRole(draft.id, {
        name: draft.name,
        color: draft.color,
        permissions: draft.permissions,
      }),
    );
  };

  const remove = async () => {
    if (!selected) return;
    if (await apply(() => ClientGameService.deleteRole(selected.id))) setSelectedId(null);
  };

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const order = ranked.map((r) => r.id).filter((id) => id !== dragId);
    const at = targetId === EVERYONE_ROLE_ID ? order.length : order.indexOf(targetId);
    order.splice(at, 0, dragId);
    setDragId(null);
    void apply(() => ClientGameService.reorderRoles(order));
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {error && <ErrorNote onClose={() => setError(null)}>{error}</ErrorNote>}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-56 shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className={labelCls + " mb-0"}>Roles — {ranked.length}</span>
            <button
              onClick={createRole}
              disabled={busy}
              className="rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 disabled:opacity-40"
            >
              + Create
            </button>
          </div>
          <p className="text-[11px] text-white/30 mb-2">Drag to reorder. Higher roles outrank lower ones.</p>

          <div className="flex-1 overflow-y-auto space-y-1">
            <button
              onClick={() => setSelectedId(OWNER_ID)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                isOwnerRole ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: OWNER_ROLE.color }} />
              <span className="truncate flex-1 text-left">Owner</span>
              <span title="Set at world setup" className="text-[11px]">👑</span>
            </button>
            {roles.map((r) => {
              const manageable = canManageRole(overview, r);
              const pinned = r.id === EVERYONE_ROLE_ID;
              return (
                <button
                  key={r.id}
                  draggable={manageable && !pinned && !busy}
                  onDragStart={() => setDragId(r.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => {
                    // Only drop into the part of the list you're allowed to rearrange.
                    if (dragId && (manageable || pinned)) e.preventDefault();
                  }}
                  onDrop={() => drop(r.id)}
                  onClick={() => setSelectedId(r.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    r.id === selectedId ? "bg-white/10" : "hover:bg-white/5"
                  } ${dragId === r.id ? "opacity-40" : ""}`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate flex-1 text-left">{pinned ? "@everyone" : r.name}</span>
                  {!manageable && <span title="Not below your highest role">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0 border-l border-white/10 pl-4 overflow-y-auto">
          {!draft || !selected ? (
            <p className="text-sm text-white/40">Select a role.</p>
          ) : (
            <div className="space-y-4 max-w-lg">
              {isOwnerRole ? (
                <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
                  The owner has every permission and outranks every role. There's exactly one, set at world setup
                  with <code className="text-white/70">AWE_OWNER_ID</code> (a Privy id, cosmos1… or 0x… address), so it
                  can't be edited, given or deleted here.
                </p>
              ) : (
                !editable && (
                  <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
                    You can't edit this role: it isn't below your highest role.
                  </p>
                )
              )}

              {isOwnerRole ? null : selected.id === EVERYONE_ROLE_ID ? (
                <p className="text-xs text-white/50">
                  Everyone has this role, signed in or not. It can't be renamed or deleted.
                </p>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Role name</label>
                    <input
                      className={inputCls}
                      value={draft.name}
                      disabled={!editable}
                      maxLength={64}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Colour</label>
                    <input
                      type="color"
                      value={draft.color}
                      disabled={!editable}
                      onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                      className="h-9 w-16 rounded bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {CATEGORIES.map((category) => (
                <div key={category}>
                  <label className={labelCls}>{category}</label>
                  <div className="space-y-2">
                    {PERMISSIONS.filter((p) => p.category === category).map((p) => {
                      const held = me.permissions.includes(p.id);
                      const disabled = !editable || !held;
                      return (
                        <label
                          key={p.id}
                          title={!held ? "You can only change permissions you have yourself." : undefined}
                          className={`flex items-start justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 ${
                            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          <span>
                            <span className="block text-sm">{p.label}</span>
                            <span className="block text-xs text-white/40">{p.description}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={disabled}
                            checked={!!draft.permissions[p.id]}
                            onChange={() =>
                              setDraft({
                                ...draft,
                                permissions: { ...draft.permissions, [p.id]: !draft.permissions[p.id] },
                              })
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!isOwnerRole && (
              <div className="flex items-center justify-between pt-2">
                {selected.id !== EVERYONE_ROLE_ID && editable ? (
                  <button onClick={remove} disabled={busy} className="text-xs text-red-400/80 hover:text-red-400">
                    Delete role
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  {dirty && (
                    <button
                      onClick={() => setDraft({ ...selected, permissions: { ...selected.permissions } })}
                      className="rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={!dirty || busy || !editable}
                    className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-40"
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {selected && (
          <div className="w-60 shrink-0 flex flex-col border-l border-white/10 pl-4 min-h-0">
            {isOwnerRole ? (
              <>
                <span className={labelCls}>Members — {overview.ownerId ? 1 : 0}</span>
                {overview.ownerId ? (
                  <div className="rounded-lg px-2 py-1.5">
                    <MemberName subject={overview.ownerId} profile={overview.profiles?.[overview.ownerId]} />
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No owner set. Add AWE_OWNER_ID to the world's environment.</p>
                )}
              </>
            ) : selected.id === EVERYONE_ROLE_ID ? (
              <>
                <span className={labelCls}>Members</span>
                <p className="text-xs text-white/40">Every player has this role.</p>
              </>
            ) : (
              <>
                <span className={labelCls}>Members — {withRole.length}</span>

                {canAssign && withoutRole.length > 0 && (
                  <select
                    className={inputCls + " mb-2"}
                    value=""
                    disabled={busy}
                    onChange={(e) => {
                      const member = overview.members.find((m) => m.subject === e.target.value);
                      if (member) setHasRole(member.subject, member.roleIds, true);
                    }}
                  >
                    <option value="">+ Give this role to…</option>
                    {withoutRole.map((m) => (
                      <option key={m.subject} value={m.subject}>
                        {nameOf(m.subject)}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex-1 overflow-y-auto space-y-1">
                  {withRole.length === 0 && (
                    <p className="text-xs text-white/40">
                      Nobody has this role yet.{canAssign ? " Add people in the Members tab first." : ""}
                    </p>
                  )}
                  {withRole.map((m) => (
                    <div key={m.subject} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                      <span className="min-w-0 flex-1">
                        <MemberName subject={m.subject} profile={overview.profiles?.[m.subject]} />
                      </span>
                      {m.banned && <span className="text-[10px] text-red-300">Banned</span>}
                      {canAssign && outranks(m.roleIds) && (
                        <button
                          onClick={() => setHasRole(m.subject, m.roleIds, false)}
                          disabled={busy}
                          title="Remove this role"
                          className="text-white/30 opacity-0 hover:text-red-300 group-hover:opacity-100 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
