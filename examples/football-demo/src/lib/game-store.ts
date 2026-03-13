import { Store } from "@/hooks/use-store";

interface GameState {
  started: boolean;
  paused: boolean;
  playerScore: number;
  aiScore: number;
  gameOver: null | "win" | "lose";
  goalScored: null | "player" | "ai";
  waitingForKickoff: boolean;
}

export const gameStore = new Store<GameState>({
  started: false,
  paused: false,
  playerScore: 0,
  aiScore: 0,
  gameOver: null,
  goalScored: null,
  waitingForKickoff: false,
});

export function setStarted(started: boolean) {
  gameStore.update({ started });
}

export function setPaused(paused: boolean) {
  gameStore.update({ paused });
}

export function setScore(playerScore: number, aiScore: number) {
  gameStore.update({ playerScore, aiScore });
}

export function setGameOver(result: "win" | "lose") {
  gameStore.update({ gameOver: result });
}

export function setGoalScored(scorer: "player" | "ai") {
  gameStore.update({ goalScored: scorer });
}

export function clearGoalScored() {
  gameStore.update({ goalScored: null });
}

export function setWaitingForKickoff(waiting: boolean) {
  gameStore.update({ waitingForKickoff: waiting });
}

export function resetGame() {
  gameStore.update({
    playerScore: 0,
    aiScore: 0,
    gameOver: null,
    goalScored: null,
    waitingForKickoff: false,
  });
}
