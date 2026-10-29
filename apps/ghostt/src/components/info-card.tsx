"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/hooks/use-store";
import {
  infoStore,
  toggleInfo,
  closeInfo,
  openInfo,
  setInfoTab,
  type InfoTab,
  type PlayerInfo,
} from "@/lib/info-store";
import { getScript } from "@/lib/game-script";
import { voiceStore } from "@/lib/voice-store";
import * as S from "./info-styles";

const ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEiElEQVR4nO2b2avVVRTHP47X1PLeJFIc8ppjoUKQ9zon1oOPpT2F9KKoOOHVKJUoQvwHEiPFWV+ukAN0c3owUSlMQXNAFBJ7Uqych1tXY8E6sNic3zm/8zt7n+Hn+cIP4bp+a6+9zt5r/kENNdQQGN2BScBnwCbgGHANuAk8AB4Ct4HLwM/AVmApMAWoo0rRB/gU+Al4BDxP+NwHflBePakCjNJf+XERm4567gDrgaFUIIYArUBHhPAXgC3AQmAGMBp4FWjQ5zXgLf2/JUp7JYJXO7ARGEiF3O9vIn7xM8ByVU5SDANWApey8L+ntqILZcJI3aQV6pne2ckB1psGHMmiiBPlOA0fqgW3gvyi1j40RBHnnbVvAR9QIix17voTYAXQuVQCAN2A1WoPrG2YE3rh1Y7mxZ+PoXyYAPzpXMHFoRZb4mz+lFrvcuN14KyjBO8n4SNlnFlEjNFLVFbgddy5Dt5swnANQuwv35vKwyuOV/oLeKNYpnWOxb0K1HsQVrzFQQ1172vIPNED337ADcdFFhUnfGmYSUw/zoOQHwP/ZvHn8rfZHvhPdLyDeK3ER/+xYbTIg3ANznVyn388nbA1huddYEASJq1OkOPDz8+JkfR84ilO+N3wlNyhIIw2wY5Y/3fwg1UxFCA0viJG6xUKyiK3m5f34w+lOgEZ2NxhQyE+9ZF5cbxHgfLZgL892YAMpjr1hF5xXprnpLS+MTvCC8gxnRVgvYtmDaks5cVRHy4kRgzfpjm9PD8CzYHWainkOvcwrk+MX3+qH0ONAh7kK7RON8RShUkLLpt9vZeL8IskVrMK8L3Zl9QuIrHNEM4nPVho9rUzF+EpQyjXIS2Y7ES1kbhuCIup5sb1BC1aOQ7lAbIZQtljJG4bwr6BhKnX9NeNA9o8B0EWPc064uUi8dQQSs0/BLJt3iohFGzJLBLthlAyqhDHPl8uEOo6ZPhLkheJO4ZQcgLfWBFDAWIXQl4BqUBF4oYhbAwgyNcxFCA0vjHY8P8jF+FJQyj5dFoUYN2guPpI7DaEc1OkgLmGv3SeI/G5IfwuRQrYEDcUft8QnkuRAmxpP2f5vbc2OzP+cmAKFDDIdLUexolvDhlhFqdAAbanKbMLebHAvPBbChRwptCCa73TEGmqYgU0OU2X2JNmO8yL+6pYAYcN328LefFtpzHSVIUKsB6tPUlk22oY/OqpNVYqBXRS+5XhuTkJk0bHFrRUUTK0zEl+EjVHBV8ZRk+0Z1gMmkuQDo936hoS3SZGN+C0YSYKqeSCSINmezbx6VqswCOUqczijS2WmbrZtgAlsTrH6ovbe5MKRrMWRH0URSW83Ws2/x8wkxcEL2cZoQ02K1hpGOlMgvgcsIjdf9+pgw/ie0uFTlrkuGc23qHur6S47lhcX6M0uTDWaeFnfL1Mn5UcBx1BnmkPPkRpe4yeto4sH2PIxxZlQS9gbcQHEz6P42ZnVPe5Tpmsq5QPqxqBXep+MgIe8MR7QBblHvAQlQbBcP1oqs3jGL0kYXs0o5N/3+UFRZdyC1BDDTWQOvwPevqe5yufCfIAAAAASUVORK5CYII=";

const TABS: { id: InfoTab; label: string }[] = [
  { id: "chunk", label: "Info" },
  { id: "players", label: "Players" },
  { id: "destinations", label: "Destinations" },
];

// Same charcoal as the info button, so the popup reads as part of it.
const PANEL_BG =
  "linear-gradient(170deg, rgb(36 36 36), rgb(18 18 18) 55%, rgb(10 10 10))";

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/** A stable hue per place, so chunks without a picture still look like somewhere. */
function placeGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `radial-gradient(120% 140% at 15% 10%, hsl(${h} 45% 34%), transparent 60%), radial-gradient(90% 120% at 95% 100%, hsl(${(h + 50) % 360} 40% 22%), transparent 70%), #141414`;
}

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

export function InfoCard() {
  const state = useStore(infoStore);

  // Toggle with the "I" key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyI") return;
      // Don't toggle while typing in a field (e.g. the destinations search).
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      toggleInfo();
      if (infoStore.state.isOpen) releasePointer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {state.isOpen && <InfoPopup />}

      {/* Persistent circular icon button (bottom-center) with live count. */}
      <InfoButton online={state.players.length} isOpen={state.isOpen} />
    </>
  );
}

function InfoPopup() {
  const { tab, chunkInfo, chunkKey, players, portals } = useStore(infoStore);
  const title = chunkInfo?.title || "Untitled place";
  const expanded = tab === "chunk";
  const counts: Partial<Record<InfoTab, number>> = { players: players.length, destinations: portals.length };

  return (
    <div
      role="dialog"
      aria-label={`About ${title}`}
      className="fixed bottom-[92px] left-1/2 z-50 flex w-[440px] max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col overflow-hidden rounded-[18px] text-[14px] text-[#e8e8e8] shadow-[0_24px_60px_rgb(0_0_0/0.55),0_0_0_1px_rgb(255_255_255/0.07)]"
      style={{ background: PANEL_BG }}
    >
      {/* The place you're in: a big picture on Info, a slim strip elsewhere. */}
      <div
        className={`relative shrink-0 overflow-hidden motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out ${
          expanded ? "h-[210px]" : "h-[64px]"
        }`}
        style={chunkInfo?.image ? undefined : { background: placeGradient(chunkKey || title) }}
      >
        {chunkInfo?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chunkInfo.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(18_18_18)] via-[rgb(18_18_18/0.35)] to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2
              className={`truncate font-semibold tracking-[-0.01em] text-white motion-safe:transition-[font-size] motion-safe:duration-300 ${
                expanded ? "text-[22px] leading-7" : "text-[16px] leading-6"
              }`}
            >
              {title}
            </h2>
            {chunkInfo?.owner && <p className="truncate text-[12px] text-white/60">by {chunkInfo.owner}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={closeInfo}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[13px] text-white/80 backdrop-blur-md hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          ✕
        </button>
      </div>

      <nav className="flex shrink-0 gap-5 border-b border-white/[0.07] px-5" aria-label="Info sections">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setInfoTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] focus-visible:outline-none focus-visible:text-white ${
                active ? "border-white font-medium text-white" : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
              {!!count && <span className={active ? "text-white/50" : "text-white/30"}>{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain [scrollbar-color:rgb(255_255_255/0.18)_transparent] [scrollbar-width:thin]">
        {tab === "chunk" && <ChunkTab />}
        {tab === "players" && <PlayersTab />}
        {tab === "destinations" && <DestinationsTab />}
      </div>
    </div>
  );
}

function InfoButton({ online, isOpen }: { online: number; isOpen: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={S.InfoButton}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        if (infoStore.state.isOpen) {
          closeInfo();
        } else {
          openInfo();
          releasePointer();
        }
      }}
    >
      <span style={S.InfoIcon}>
        <img src={ICON} alt="Info" width={64} height={64} draggable={false} />
      </span>
      {online > 0 && <div style={S.OnlineCount}>{online}</div>}
      {hover && !isOpen && <div style={S.Balloon}>Press i</div>}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-white ${
        tone === "danger"
          ? "text-[#ff9b9b] hover:bg-[#ff6b6b]/15"
          : "bg-white/[0.08] text-white/85 hover:bg-white/[0.16] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[14px] text-white/70">{title}</p>
      {children && <p className="mt-1 text-[12px] text-white/40">{children}</p>}
    </div>
  );
}

function ChunkTab() {
  const { chunkInfo } = useStore(infoStore);
  const tags = chunkInfo?.tags ?? [];

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {chunkInfo?.description ? (
        <p className="max-w-[60ch] whitespace-pre-line leading-[1.6] text-white/80">{chunkInfo.description}</p>
      ) : (
        <p className="text-white/40">The owner hasn&apos;t described this place yet.</p>
      )}

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map((t) => (
            <li key={t} className="rounded-full border border-white/[0.12] px-2.5 py-0.5 text-[12px] text-white/70">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayerAvatar({ player, speaking }: { player: PlayerInfo; speaking: boolean }) {
  const ring = speaking ? "ring-2 ring-[#4ade80] ring-offset-2 ring-offset-[#151515]" : "";
  if (player.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.avatar}
        alt=""
        referrerPolicy="no-referrer"
        className={`h-9 w-9 shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ${ring}`}
      style={{ background: player.roleColor ? `${player.roleColor}55` : "rgb(255 255 255 / 0.1)" }}
    >
      {(player.name || "G")[0].toUpperCase()}
    </span>
  );
}

function PlayerRow({ player }: { player: PlayerInfo }) {
  const { self } = useStore(infoStore);

  // Mirrors the server: only players ranked below you. The server re-checks.
  const outranks = !!self && !player.isLocal && player.rolePosition < self.rolePosition;
  const canKick = outranks && self.permissions.includes("kick_members");
  const canBan = outranks && self.permissions.includes("ban_members");
  const canMute = outranks && player.inVoice && self.permissions.includes("mute_members");
  const speaking = useStore(voiceStore).speaking[player.sessionId] === true;
  const voice = !player.inVoice
    ? null
    : player.voiceMuted
      ? "Muted by a moderator"
      : speaking
        ? "Talking"
        : "In voice";

  return (
    <li className="group flex items-center gap-3 px-5 py-2 hover:bg-white/[0.04]">
      <PlayerAvatar player={player} speaking={speaking} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-white">
          {player.name || `Guest ${shortId(player.sessionId)}`}
          {player.isLocal && <span className="text-white/40"> (you)</span>}
        </p>
        {voice && (
          <p className={`text-[12px] ${player.voiceMuted ? "text-[#ff9b9b]" : speaking ? "text-[#4ade80]" : "text-white/40"}`}>
            {voice}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
        {canMute && (
          <ActionButton tone="danger" onClick={() => getScript()?.mutePlayer(player.sessionId, !player.voiceMuted)}>
            {player.voiceMuted ? "Unmute" : "Mute"}
          </ActionButton>
        )}
        {canKick && (
          <ActionButton tone="danger" onClick={() => getScript()?.kickPlayer(player.sessionId)}>
            Kick
          </ActionButton>
        )}
        {canBan && (
          <ActionButton tone="danger" onClick={() => getScript()?.banPlayer(player.sessionId)}>
            Ban
          </ActionButton>
        )}
        {!player.isLocal && (
          <ActionButton onClick={() => getScript()?.teleportToPlayer(player.sessionId)}>Teleport</ActionButton>
        )}
      </div>
    </li>
  );
}

function PlayerGroup({ label, color, members }: { label: string; color?: string; members: PlayerInfo[] }) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 pb-1 pt-3 text-left text-[12px] font-medium text-white/50 hover:text-white/80"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color || "rgb(255 255 255 / 0.3)" }} />
        <span style={color ? { color } : undefined}>{label}</span>
        <span className="text-white/30">{members.length}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`ml-auto motion-safe:transition-transform ${open ? "" : "-rotate-90"}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul>
          {members.map((p) => (
            <PlayerRow key={p.sessionId} player={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlayersTab() {
  const { players } = useStore(infoStore);

  // Discord-style member list: one group per highest role, highest rank first,
  // then everyone without a role.
  const byRole = new Map<string, { label: string; color: string; rank: number; members: PlayerInfo[] }>();
  for (const p of players) {
    const id = p.roleName ? p.roleId : "everyone";
    const group = byRole.get(id) ?? {
      label: p.roleName || "Everyone",
      color: p.roleName ? p.roleColor : "",
      rank: p.roleName ? p.rolePosition : -1,
      members: [],
    };
    group.members.push(p);
    byRole.set(id, group);
  }
  const groups = [...byRole.values()].sort((a, b) => b.rank - a.rank);

  if (groups.length === 0) return <Empty title="Nobody's here yet">Players show up here as they join.</Empty>;

  return (
    <div className="pb-2">
      {groups.map((g) => (
        <PlayerGroup key={`${g.rank}-${g.label}`} label={g.label} color={g.color} members={g.members} />
      ))}
    </div>
  );
}

function DestinationsTab() {
  const { portals } = useStore(infoStore);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? portals.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
    : portals;

  if (portals.length === 0) {
    return <Empty title="No destinations yet">Portals placed in this world show up here.</Empty>;
  }

  const go = async (position: { x: number; y: number; z: number }) => {
    await getScript()?.travelTo(position);
    closeInfo();
  };

  return (
    <div className="pb-2">
      {portals.length > 4 && (
        <div className="sticky top-0 z-10 px-5 pb-2 pt-3" style={{ background: "rgb(18 18 18 / 0.96)" }}>
          <div className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3.5 focus-within:bg-white/[0.11]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-white/40">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <input
              className="w-full bg-transparent py-2 text-[13px] text-white outline-none placeholder:text-white/40"
              placeholder="Search destinations"
              aria-label="Search destinations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty title={`Nothing matches “${query.trim()}”`}>Try a different name.</Empty>
      ) : (
        <ul className="pt-1">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void go(p.position)}
                className="group flex w-full items-center gap-3 px-5 py-2 text-left hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span
                    className="h-11 w-11 shrink-0 rounded-[10px]"
                    style={{ background: placeGradient(p.slug || p.name) }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white">{p.name}</span>
                  {p.slug && <span className="block truncate text-[12px] text-white/40">{p.slug}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1 text-[12px] font-medium text-white/85 group-hover:bg-white/[0.16] group-hover:text-white">
                  Teleport
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
