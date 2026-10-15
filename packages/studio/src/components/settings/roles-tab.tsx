"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientGameService } from "../../services/client-game-service";
import { PERMISSIONS } from "../../server/access/permissions";
import { EVERYONE_ROLE_ID, type Role } from "../../server/access/types";
import { canManageRole, useAccessOverview } from "./use-access-overview";
import { ErrorNote, inputCls, labelCls } from "./ui";

const CATEGORIES = [...new Set(PERMISSIONS.map((p) => p.category))];

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
  const selected = roles.find((r) => r.id === selectedId) ?? null;

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
  const editable = !!selected && canManageRole(overview, selected);
  const ranked = roles.filter((r) => r.id !== EVERYONE_ROLE_ID);

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
              {!editable && (
                <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
                  You can't edit this role: it isn't below your highest role.
                </p>
              )}

              {selected.id === EVERYONE_ROLE_ID ? (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
