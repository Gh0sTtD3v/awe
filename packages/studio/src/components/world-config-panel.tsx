"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ClientGameService } from "../services/client-game-service";
import { useContentTab } from "../contexts/content-tab-context";
import { useCurrentGameData } from "../contexts/game-data-context";
import { useAccess } from "../contexts/access-context";
import { ImageInput } from "./gui/controls/image-input";
import { RolesTab } from "./settings/roles-tab";
import { MembersTab } from "./settings/members-tab";
import { ErrorNote, inputCls, labelCls } from "./settings/ui";
import type { ChunkConfig } from "../server/game-service";
import { EVERYONE_ROLE_ID, type Role } from "../server/access/types";
import type { Permission } from "../server/access/permissions";

type TabId = "chunk" | "roles" | "members";

/** Each tab shows only to people holding one of its permissions. */
const TABS: { id: TabId; label: string; needs: Permission[] }[] = [
  { id: "chunk", label: "Chunk", needs: ["manage_world"] },
  { id: "roles", label: "Roles", needs: ["manage_roles"] },
  { id: "members", label: "Members", needs: ["manage_members", "ban_members"] },
];

export function WorldConfigPanel() {
  const { can } = useAccess();
  const tabs = TABS.filter((t) => t.needs.some(can));
  const [chosen, setTab] = useState<TabId | null>(null);
  const tab = tabs.find((t) => t.id === chosen)?.id ?? tabs[0]?.id ?? null;

  const { setActiveTab } = useContentTab();
  const { gameData } = useCurrentGameData();
  const initialChunk = (gameData as any)?._chunkKey ?? null;

  return (
    <div className="content-tab w-[60vw] max-w-[60vw] h-full flex flex-col rounded-[14px] bg-studio-black text-white border border-white/10 overflow-hidden pointer-events-auto">
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/10 shrink-0">
        <span className="text-base font-semibold">Settings</span>
        <button
          onClick={() => setActiveTab(null)}
          className="h-7 w-7 rounded-full text-white/50 hover:text-white hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <nav className="w-48 shrink-0 border-r border-white/10 p-3 flex flex-col gap-1">
          {tabs.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {tab === "chunk" && <ChunkConfigTab initialChunk={initialChunk} />}
          {tab === "roles" && <RolesTab />}
          {tab === "members" && <MembersTab />}
          {!tab && <p className="text-sm text-white/40">You don't have permission to change world settings.</p>}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

// ── Chunk tab ──────────────────────────────────────────────────────────────

/**
 * Open the game in a new tab as a member holding only this role (plus
 * @everyone), Discord's "View server as role". The game server honours it
 * only for administrators.
 */
function PreviewRoleButton({ roleId, name }: { roleId: string; name: string }) {
  return (
    <button
      type="button"
      title={`Play as ${name}`}
      aria-label={`Play as ${name}`}
      onClick={() => {
        const url = new URL("/", window.location.origin);
        url.searchParams.set("previewRole", roleId);
        window.open(url.toString(), "_blank");
      }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden>
        <path d="M4 2.5v11l9-5.5z" />
      </svg>
    </button>
  );
}

function ChunkConfigTab({ initialChunk }: { initialChunk?: string | null }) {
  const { can } = useAccess();
  const canPreview = can("administrator");
  const [chunks, setChunks] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [chunkKey, setChunkKey] = useState<string>("");
  const [config, setConfig] = useState<ChunkConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Public = no roles listed. Restricted with nothing ticked yet is allowed while editing. */
  const [restricted, setRestricted] = useState(false);
  /** The roles last ticked, restored when switching back from Public. */
  const lastAuth = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, r] = await Promise.all([
        ClientGameService.listChunks(),
        ClientGameService.getRoles(),
      ]);
      if (!alive) return;
      setChunks(list);
      setRoles(r);
      const first = initialChunk && list.includes(initialChunk) ? initialChunk : list[0];
      setChunkKey(first ?? "");
    })();
    return () => {
      alive = false;
    };
  }, [initialChunk]);

  useEffect(() => {
    if (!chunkKey) {
      setConfig(null);
      return;
    }
    let alive = true;
    ClientGameService.getChunkConfig(chunkKey).then((c) => {
      if (!alive) return;
      setConfig(c);
      setRestricted(c.auth.length > 0);
      lastAuth.current = c.auth;
    });
    return () => {
      alive = false;
    };
  }, [chunkKey]);

  const tagsText = useMemo(() => (config?.info.tags ?? []).join(", "), [config]);

  if (chunks.length === 0) {
    return <p className="text-sm text-white/40">No chunks yet. Add assets to the scene first.</p>;
  }

  const patchInfo = (patch: Partial<ChunkConfig["info"]>) =>
    setConfig((c) => (c ? { ...c, info: { ...c.info, ...patch } } : c));

  const toggleAuth = (roleId: string) =>
    setConfig((c) => {
      if (!c) return c;
      const has = c.auth.includes(roleId);
      return {
        ...c,
        auth: has ? c.auth.filter((id) => id !== roleId) : [...c.auth, roleId],
      };
    });

  const setAccessMode = (mode: "public" | "restricted") => {
    if ((mode === "restricted") === restricted) return;
    setRestricted(mode === "restricted");
    setConfig((c) => {
      if (!c) return c;
      if (mode === "public") {
        lastAuth.current = c.auth;
        return { ...c, auth: [] };
      }
      return { ...c, auth: lastAuth.current };
    });
  };

  const save = async () => {
    if (!config || !chunkKey) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await ClientGameService.setChunkConfig(chunkKey, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Couldn't save. You may not have the Manage World permission.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className={labelCls}>Chunk</label>
        <select
          className={inputCls}
          value={chunkKey}
          onChange={(e) => setChunkKey(e.target.value)}
        >
          {chunks.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {config && (
        <>
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={config.info.title ?? ""}
              onChange={(e) => patchInfo({ title: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Owner</label>
            <input
              className={inputCls}
              value={config.info.owner ?? ""}
              onChange={(e) => patchInfo({ owner: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input
              className={inputCls}
              value={tagsText}
              onChange={(e) =>
                patchInfo({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div>
            <label className={labelCls}>Image</label>
            <ImageInput
              value={config.info.image ? { image: config.info.image } : null}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              acceptLabel=".png .jpg .webp"
              onChange={(v: any) =>
                patchInfo({ image: v?.image ?? v?.path ?? "" })
              }
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} h-24 resize-none`}
              value={config.info.description ?? ""}
              onChange={(e) => patchInfo({ description: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Access</label>
            <div className="mb-2 inline-flex rounded-lg border border-white/15 p-0.5" role="radiogroup" aria-label="Access">
              {([
                ["public", "Public"],
                ["restricted", "Restricted"],
              ] as const).map(([mode, label]) => {
                const active = (mode === "restricted") === restricted;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAccessMode(mode)}
                    className={`rounded-md px-3 py-1 text-sm ${
                      active ? "bg-white text-black font-medium" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mb-2 text-xs text-white/40">
              {restricted
                ? "Only players with one of the ticked roles can enter. Admins always can."
                : "Anyone can enter, signed in or not."}
            </p>

            <div className="space-y-1.5">
              {/* @everyone can't be ticked: picking Public is how a chunk is opened to everyone. */}
              <div className="flex items-center gap-2">
                <span className={`flex flex-1 items-center gap-2 text-sm ${restricted ? "text-white/40" : ""}`}>
                  {restricted && <input type="checkbox" checked={false} disabled aria-label="@everyone" />}
                  <span className="h-3 w-3 rounded-full bg-white/40" />
                  @everyone
                </span>
                {canPreview && <PreviewRoleButton roleId={EVERYONE_ROLE_ID} name="@everyone" />}
              </div>
              {roles.filter((r) => r.id !== EVERYONE_ROLE_ID).map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <label className={`flex flex-1 items-center gap-2 text-sm ${restricted ? "cursor-pointer" : ""}`}>
                    {restricted && (
                      <input
                        type="checkbox"
                        checked={config.auth.includes(r.id)}
                        onChange={() => toggleAuth(r.id)}
                      />
                    )}
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: r.color }}
                    />
                    {r.name}
                  </label>
                  {canPreview && <PreviewRoleButton roleId={r.id} name={r.name} />}
                </div>
              ))}
              {restricted && config.auth.length === 0 && (
                <p className="pt-1 text-xs text-amber-300">
                  Tick at least one role. With none ticked, the chunk saves as public.
                </p>
              )}
            </div>
          </div>

          {error && <ErrorNote onClose={() => setError(null)}>{error}</ErrorNote>}
          <SaveBar saving={saving} saved={saved} onSave={save} />
        </>
      )}
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && <span className="text-xs text-green-400">Saved</span>}
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
