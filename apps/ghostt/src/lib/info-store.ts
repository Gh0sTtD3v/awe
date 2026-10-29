import { Store } from "@/hooks/use-store";
import type { PortalEntry } from "./portals";
import type { ScreenState } from "../../shared/screens";

export type InfoTab = "players" | "chunk" | "destinations";

export interface PlayerInfo {
  sessionId: string;
  x: number;
  y: number;
  z: number;
  isLocal: boolean;
  /** Profile username; empty when signed out or not set. */
  name: string;
  /** Profile picture URL, or empty. */
  avatar: string;
  /** Highest role; `roleName` is empty for players with only `everyone`. */
  roleId: string;
  roleName: string;
  roleColor: string;
  /** Moderation rank: you can act only on players ranked below you. */
  rolePosition: number;
  inVoice: boolean;
  /** Silenced in voice by a moderator. */
  voiceMuted: boolean;
  /** Live to their chunk (Broadcast Voice). */
  broadcasting: boolean;
}

/** What the local player may do, as the server resolved it. */
export interface SelfAccess {
  isOwner: boolean;
  permissions: string[];
  rolePosition: number;
  /** The role an admin is previewing the world as, if any. */
  preview: { roleId: string; name: string; color: string } | null;
}

/** The lift box the local player is standing in, and that lift's floors. */
export interface NearLift {
  id: string;
  group: string;
  floor: number;
  label: string;
  /** Highest first, including the current floor. */
  floors: LiftFloor[];
}

export interface LiftFloor {
  id: string;
  floor: number;
  label: string;
  /** Behind a token gate or members-only chunk this player may not enter. */
  locked: boolean;
  /** Why it's locked, e.g. "≥ 100 ROIDS". */
  lockReason: string;
}

/** The video screen the local player is standing at. */
export interface NearScreen {
  id: string;
  label: string;
  items: { title: string; url: string }[];
  ads: { title: string; url: string }[];
  /** Shared playback, with `at` on this client's clock. Null until the server sends it. */
  state: ScreenState | null;
  /** Control Screens, or access to the screen's token gate. The server re-checks. */
  canControl: boolean;
  /** The video on screen couldn't be loaded here. */
  loadError: boolean;
}

export interface ChunkInfo {
  title?: string;
  owner?: string;
  tags?: string[];
  image?: string;
  description?: string;
  [key: string]: unknown;
}

export interface InfoState {
  isOpen: boolean;
  tab: InfoTab;
  players: PlayerInfo[];
  chunkKey: string | null;
  chunkLoading: boolean;
  chunkInfo: ChunkInfo | null;
  portals: PortalEntry[];
  /** Shown briefly when a token gate or members-only chunk turns the player away. */
  gateNotice: GateNotice | null;
  self: SelfAccess | null;
  /** Set when a moderator removed this player; the game is over for this session. */
  removed: { reason: string } | null;
  /** Feedback for the local moderator's last kick or ban. */
  modMessage: { text: string; at: number } | null;
  nearScreen: NearScreen | null;
  screenPanelOpen: boolean;
  nearLift: NearLift | null;
  liftPanelOpen: boolean;
}

export interface GateNotice {
  kind: "gate" | "chunk";
  /** Gate label or chunk title. */
  label: string;
  /** Gates: e.g. "≥ 100 ROIDS". Chunks: the allowed role names, comma separated. */
  requirement: string;
  /** Bumped on every denial so the same notice can re-show. */
  at: number;
}

export const infoStore = new Store<InfoState>({
  isOpen: false,
  tab: "chunk",
  players: [],
  chunkKey: null,
  chunkLoading: false,
  chunkInfo: null,
  portals: [],
  gateNotice: null,
  self: null,
  removed: null,
  modMessage: null,
  nearScreen: null,
  screenPanelOpen: false,
  nearLift: null,
  liftPanelOpen: false,
});

export function openInfo(tab?: InfoTab) {
  infoStore.update((s) => ({ ...s, isOpen: true, tab: tab ?? s.tab }));
}

export function closeInfo() {
  infoStore.update({ isOpen: false });
}

export function toggleInfo() {
  infoStore.update((s) => ({ ...s, isOpen: !s.isOpen }));
}

export function setInfoTab(tab: InfoTab) {
  infoStore.update({ tab });
}

/**
 * Both setters below run once per frame from the game loop. `Store.update`
 * always allocates a new state object and notifies, so writing unconditionally
 * would re-render every subscriber at frame rate. Bail out when nothing
 * actually changed.
 */

function samePlayers(a: PlayerInfo[], b: PlayerInfo[]) {
  if (a.length !== b.length) return false;

  return a.every((p, i) => {
    const q = b[i];
    return (
      p.sessionId === q.sessionId &&
      p.x === q.x &&
      p.y === q.y &&
      p.z === q.z &&
      p.isLocal === q.isLocal &&
      p.name === q.name &&
      p.avatar === q.avatar &&
      p.roleId === q.roleId &&
      p.roleName === q.roleName &&
      p.roleColor === q.roleColor &&
      p.rolePosition === q.rolePosition &&
      p.inVoice === q.inVoice &&
      p.voiceMuted === q.voiceMuted &&
      p.broadcasting === q.broadcasting
    );
  });
}

export function setPlayers(players: PlayerInfo[]) {
  if (samePlayers(infoStore.state.players, players)) return;
  infoStore.update({ players });
}

export function setChunk(chunkKey: string | null, chunkInfo: ChunkInfo | null) {
  const state = infoStore.state;

  if (state.chunkKey === chunkKey && state.chunkInfo === chunkInfo) return;

  infoStore.update({ chunkKey, chunkInfo });
}

/**
 * Driven by ChunkManager's transition callbacks rather than the polled sync
 * above — a chunk can finish loading inside a single poll interval, which
 * would leave the indicator stuck on or never show it at all.
 */
export function setChunkLoading(chunkLoading: boolean) {
  if (infoStore.state.chunkLoading === chunkLoading) return;
  infoStore.update({ chunkLoading });
}

export function setPortals(portals: PortalEntry[]) {
  infoStore.update({ portals });
}

export function showGateNotice(label: string, requirement: string, kind: GateNotice["kind"] = "gate") {
  infoStore.update({ gateNotice: { kind, label, requirement, at: Date.now() } });
}

export function setSelfAccess(self: SelfAccess | null) {
  infoStore.update({ self });
}

export function setRemoved(reason: string) {
  infoStore.update({ removed: { reason }, isOpen: false });
}

export function showModMessage(text: string) {
  infoStore.update({ modMessage: { text, at: Date.now() } });
}

export function clearGateNotice() {
  if (infoStore.state.gateNotice) infoStore.update({ gateNotice: null });
}

/** Polled from the game loop; only notifies when the screen or its playback changed. */
export function setNearScreen(nearScreen: NearScreen | null) {
  const prev = infoStore.state.nearScreen;
  if (
    prev === nearScreen ||
    (prev &&
      nearScreen &&
      prev.id === nearScreen.id &&
      prev.label === nearScreen.label &&
      prev.state === nearScreen.state &&
      prev.canControl === nearScreen.canControl &&
      prev.loadError === nearScreen.loadError &&
      prev.items === nearScreen.items &&
      prev.ads === nearScreen.ads)
  ) {
    return;
  }
  infoStore.update((s) => ({
    ...s,
    nearScreen,
    // Walking away, or over to another screen, closes the controls.
    screenPanelOpen: nearScreen && prev && prev.id === nearScreen.id ? s.screenPanelOpen : false,
  }));
}

export function setScreenPanelOpen(screenPanelOpen: boolean) {
  if (infoStore.state.screenPanelOpen === screenPanelOpen) return;
  infoStore.update({ screenPanelOpen });
}

function liftKey(lift: NearLift | null): string {
  if (!lift) return "";
  const floors = lift.floors.map((f) => `${f.id}:${f.floor}:${f.label}:${f.locked}:${f.lockReason}`);
  return `${lift.id}|${lift.group}|${lift.floor}|${lift.label}|${floors.join(",")}`;
}

/** Polled from the game loop; only notifies when the lift or its floors changed. */
export function setNearLift(nearLift: NearLift | null) {
  const prev = infoStore.state.nearLift;
  if (liftKey(prev) === liftKey(nearLift)) return;
  infoStore.update((s) => ({
    ...s,
    nearLift,
    // Stepping out, or arriving at another floor, closes the panel.
    liftPanelOpen: nearLift && prev && prev.id === nearLift.id ? s.liftPanelOpen : false,
  }));
}

export function setLiftPanelOpen(liftPanelOpen: boolean) {
  if (infoStore.state.liftPanelOpen === liftPanelOpen) return;
  infoStore.update({ liftPanelOpen });
}
