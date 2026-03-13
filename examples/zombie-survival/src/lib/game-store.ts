import { Store } from "@/hooks/use-store";
import { GAME_CONFIG } from "@/lib/game-config";

export type GamePhase = "menu" | "playing" | "won" | "lost";

interface GameState {
  gamePhase: GamePhase;
  playerHealth: number;
  zombieAliveCount: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  matchTimeRemaining: number;
  zombiesKilled: number;
}

const initialState: GameState = {
  gamePhase: "menu",
  playerHealth: GAME_CONFIG.playerMaxHealth,
  zombieAliveCount: 0,
  ammo: GAME_CONFIG.ammoCapacity,
  maxAmmo: GAME_CONFIG.ammoCapacity,
  isReloading: false,
  matchTimeRemaining: GAME_CONFIG.matchDuration,
  zombiesKilled: 0,
};

export const gameStore = new Store<GameState>({ ...initialState });

export function setGamePhase(gamePhase: GamePhase) {
  gameStore.update({ gamePhase });
}

export function setPlayerHealth(playerHealth: number) {
  gameStore.update({ playerHealth: Math.max(0, playerHealth) });
}

export function setZombieAliveCount(zombieAliveCount: number) {
  gameStore.update({ zombieAliveCount });
}

export function decrementAmmo() {
  const state = gameStore.getState();
  if (state.ammo > 0) {
    gameStore.update({ ammo: state.ammo - 1 });
  }
}

export function setAmmo(ammo: number) {
  gameStore.update({ ammo });
}

export function setIsReloading(isReloading: boolean) {
  gameStore.update({ isReloading });
}

export function setMatchTimeRemaining(matchTimeRemaining: number) {
  gameStore.update({ matchTimeRemaining });
}

export function incrementZombiesKilled() {
  const state = gameStore.getState();
  gameStore.update({ zombiesKilled: state.zombiesKilled + 1 });
}

export function setZombiesKilled(zombiesKilled: number) {
  gameStore.update({ zombiesKilled });
}

export function takeDamage(amount: number) {
  const state = gameStore.getState();
  if (state.gamePhase !== "playing") return;
  const newHealth = Math.max(0, state.playerHealth - amount);
  gameStore.update({ playerHealth: newHealth });
  if (newHealth <= 0) {
    gameStore.update({ gamePhase: "lost" });
  }
}

export function resetGame() {
  gameStore.update({ ...initialState });
}
