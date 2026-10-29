import { Store } from "@/hooks/use-store";
import type { ChatMessage } from "../../shared/messages";
import { WORLD_CHANNEL } from "../../shared/zones";

/** Messages kept per channel. Only ever in memory: a reload starts empty. */
const MAX_PER_CHANNEL = 200;

export interface ChatRoom {
  channel: string;
  label: string;
}

/** A received message, stamped with this client's clock for fading. */
export type ChatEntry = ChatMessage & { receivedAt: number };

export interface ChatState {
  /** What this player received while connected, by channel. */
  byChannel: Record<string, ChatEntry[]>;
  /** The room the player is standing in, if any. */
  room: ChatRoom | null;
  /** The tab being read and written to. */
  active: string;
  /** The input is open (typing). */
  open: boolean;
  /** Why the last message wasn't sent. */
  error: string | null;
  /** Messages that arrived on tabs not being read. */
  unread: Record<string, number>;
}

export const chatStore = new Store<ChatState>({
  byChannel: {},
  room: null,
  active: WORLD_CHANNEL,
  open: false,
  error: null,
  unread: {},
});

export function addChatMessage(message: ChatMessage) {
  const state = chatStore.state;
  const entry: ChatEntry = { ...message, receivedAt: Date.now() };
  const list = [...(state.byChannel[message.channel] ?? []), entry].slice(-MAX_PER_CHANNEL);
  const reading = state.active === message.channel && state.open;
  chatStore.update({
    byChannel: { ...state.byChannel, [message.channel]: list },
    unread: reading ? state.unread : { ...state.unread, [message.channel]: (state.unread[message.channel] ?? 0) + 1 },
  });
}

/** Walking into or out of a room. Leaving the room you're reading goes back to World. */
export function setChatRoom(room: ChatRoom | null) {
  const state = chatStore.state;
  const leftActive = state.active !== WORLD_CHANNEL && state.active !== room?.channel;
  chatStore.update({ room, active: leftActive ? WORLD_CHANNEL : state.active });
}

export function setActiveChannel(channel: string) {
  const state = chatStore.state;
  chatStore.update({ active: channel, unread: { ...state.unread, [channel]: 0 } });
}

export function openChat() {
  const state = chatStore.state;
  chatStore.update({ open: true, error: null, unread: { ...state.unread, [state.active]: 0 } });
}

export function closeChat() {
  chatStore.update({ open: false });
}

export function setChatError(error: string | null) {
  chatStore.update({ error });
}
