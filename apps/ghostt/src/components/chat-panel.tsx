"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { getScript } from "../lib/game-script";
import { infoStore } from "../lib/info-store";
import {
  chatStore,
  closeChat,
  openChat,
  setActiveChannel,
  setChatError,
  type ChatEntry,
} from "../lib/chat-store";
import { CHAT_MAX_LENGTH, cleanChatText } from "../../shared/messages";
import { WORLD_CHANNEL } from "../../shared/zones";

/** While the chat is closed, new lines stay on screen this long. */
const LINGER_MS = 10_000;

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

function isTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
}

/**
 * Text chat. World chat for everyone, plus a tab for the room you're standing
 * in (a token-gated area or a chat zone). Enter to type, Enter to send, Tab to
 * switch between World and the room, Esc to close. Only what was said while
 * you were here shows up: nothing is stored.
 */
export function ChatPanel() {
  const chat = useStore(chatStore);
  const { self, players } = useStore(infoStore);
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const local = players.find((p) => p.isLocal);
  const blocked = !self?.permissions.includes("send_messages")
    ? "You can't send messages here."
    : local?.voiceMuted
      ? "You're muted by a moderator."
      : null;

  const tabs = [{ channel: WORLD_CHANNEL, label: "World" }, ...(chat.room ? [chat.room] : [])];
  const messages = chat.byChannel[chat.active] ?? [];
  const recent = messages.filter((m) => now - m.receivedAt < LINGER_MS).slice(-6);
  const roomUnread = chat.room ? (chat.unread[chat.room.channel] ?? 0) : 0;

  // Enter opens the chat from anywhere in the game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || chatStore.state.open || isTyping()) return;
      e.preventDefault();
      openChat();
      releasePointer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (chat.open) inputRef.current?.focus();
  }, [chat.open]);

  // Fade lines out while closed.
  useEffect(() => {
    if (chat.open || recent.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [chat.open, recent.length]);

  // A new message brings the fade window back.
  useEffect(() => setNow(Date.now()), [messages.length]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, chat.open, chat.active]);

  // A refusal disappears after a few seconds.
  useEffect(() => {
    if (!chat.error) return;
    const timer = setTimeout(() => setChatError(null), 4000);
    return () => clearTimeout(timer);
  }, [chat.error]);

  const close = () => {
    closeChat();
    inputRef.current?.blur();
  };

  const send = () => {
    const clean = cleanChatText(text);
    if (clean && !blocked) getScript()?.sendChat(chat.active, clean);
    setText("");
    close();
  };

  const cycleTab = () => {
    const i = tabs.findIndex((t) => t.channel === chat.active);
    setActiveChannel(tabs[(i + 1) % tabs.length].channel);
  };

  // Closed: recent lines fade in and out, plus a hint to open the chat.
  if (!chat.open) {
    return (
      <div className="pointer-events-none flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-1.5">
        {recent.length > 0 && (
          <div className="flex flex-col gap-1">
            {recent.map((m) => (
              <ChatLine key={m.id} message={m} faded={now - m.receivedAt > LINGER_MS - 2000} />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            openChat();
            releasePointer();
          }}
          className="pointer-events-auto flex w-fit items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm hover:bg-black/75 hover:text-white"
        >
          <ChatIcon />
          <span>
            Chat <kbd className="ml-1 rounded border border-white/20 px-1 font-mono text-[10px]">Enter</kbd>
          </span>
          {chat.room && (
            <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[11px] text-sky-200">
              {chat.room.label}
              {roomUnread > 0 && ` · ${roomUnread}`}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Open: tabs, the full log of this session, and the input.
  return (
    <div
      className="pointer-events-auto flex w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl bg-black/75 text-sm text-white/90 shadow-xl backdrop-blur-sm"
      // Typing must not move the player or trigger other shortcuts (I, E, T…).
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-2 pt-2">
        {tabs.map((t) => {
          const active = t.channel === chat.active;
          const unread = active ? 0 : (chat.unread[t.channel] ?? 0);
          return (
            <button
              key={t.channel}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveChannel(t.channel)}
              className={`-mb-px flex max-w-[60%] items-center gap-1.5 border-b-2 px-2.5 pb-1.5 text-xs ${
                active ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <span className="truncate">{t.label}</span>
              {unread > 0 && <span className="rounded-full bg-sky-400/80 px-1.5 text-[10px] text-black">{unread}</span>}
            </button>
          );
        })}
        {tabs.length > 1 && <span className="ml-auto pb-1.5 text-[10px] text-white/30">Tab to switch</span>}
      </div>

      <div ref={logRef} className="flex max-h-56 min-h-16 flex-col gap-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        {messages.length === 0 ? (
          <p className="py-3 text-center text-xs text-white/35">
            {chat.active === WORLD_CHANNEL ? "No messages yet. Say hi to everyone." : `Only people in ${chat.room?.label ?? "this room"} can see this.`}
          </p>
        ) : (
          messages.map((m) => <ChatLine key={m.id} message={m} />)
        )}
      </div>

      {chat.error && <p className="px-3 pb-1 text-xs text-red-300">{chat.error}</p>}

      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <input
          ref={inputRef}
          value={text}
          disabled={!!blocked}
          maxLength={CHAT_MAX_LENGTH}
          placeholder={blocked ?? `Message ${tabs.find((t) => t.channel === chat.active)?.label ?? "World"}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "Tab") {
              e.preventDefault();
              cycleTab();
            }
          }}
          onBlur={() => !text && closeChat()}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={close}
          aria-label="Close chat"
          className="text-xs text-white/40 hover:text-white"
        >
          Esc
        </button>
      </div>
    </div>
  );
}

function ChatLine({ message, faded }: { message: ChatEntry; faded?: boolean }) {
  return (
    <p
      className={`w-fit max-w-full break-words rounded-lg bg-black/50 px-2 py-0.5 text-[13px] leading-5 text-white/90 transition-opacity duration-1000 ${
        faded ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className="font-semibold" style={{ color: message.roleColor || "#9ad1ff" }}>
        {message.name}
      </span>
      <span className="text-white/40">: </span>
      {message.text}
    </p>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}
