import { Store } from "@/hooks/use-store";

interface GameState {
  started: boolean;
  paused: boolean;
  /** Movement modes (K / J). */
  flying: boolean;
  fast: boolean;
  /** Short centred message when a mode is toggled, e.g. "FLY MODE ON". */
  modeNotice: string | null;
  /** V: every UI element hidden, for recording. */
  uiHidden: boolean;
}

export const gameStore = new Store<GameState>({
  started: false,
  paused: false,
  flying: false,
  fast: false,
  modeNotice: null,
  uiHidden: false,
});

export function setStarted(started: boolean) {
  gameStore.update({ started });
}

export function setPaused(paused: boolean) {
  gameStore.update({ paused });
}

export function setFlying(flying: boolean) {
  gameStore.update({ flying });
}

export function setFast(fast: boolean) {
  gameStore.update({ fast });
}

export function setUiHidden(uiHidden: boolean) {
  gameStore.update({ uiHidden });
}

let modeNoticeTimer: ReturnType<typeof setTimeout> | undefined;

/** Shows `text` for 2 s, like the studio's FAST MODE notice. */
export function showModeNotice(text: string) {
  clearTimeout(modeNoticeTimer);
  gameStore.update({ modeNotice: text });
  modeNoticeTimer = setTimeout(() => gameStore.update({ modeNotice: null }), 2000);
}
