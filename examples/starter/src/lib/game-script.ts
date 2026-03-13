import { Camera, type Space, AvatarComponent } from "@oncyberio/engine";
import { createGame } from "@/lib/utils";
import {
  createPlatformer,
  type ControlSystem,
} from "@oncyber/game-utils/control-presets";
import { gameStore, setStarted, setPaused } from "@/lib/game-store";

// Module-level reference for external control
let scriptInstance: GameScript | null = null;

export function startGame() {
  scriptInstance?.start();
}

export function togglePause() {
  scriptInstance?.togglePause();
}

export class GameScript {
  private space: Space | null = null;
  private controls: ControlSystem | null = null;
  private cleanup: (() => void) | null = null;

  private _player: AvatarComponent | null = null;

  /**
   * Initialize the game scene.
   * Returns when space is fully loaded and ready.
   */
  async init() {
    scriptInstance = this;

    // Create space - returns when fully loaded
    const { space, reveal } = await createGame({ baseUrl: "" });
    this.space = space;

    // Components are immediately available after await
    this._player = this.space.components.byId("player") as AvatarComponent;

    if (!this._player) {
      console.warn("[Game] Player avatar not found");
      return;
    }

    // Setup platformer controls
    this.controls = createPlatformer(this.space, this._player, Camera.current, {
      movement: { speed: 15, gravity: -1.81 },
      jump: {
        height: 5,
        duration: 1,
        maxJumps: 2,
        coyoteTime: Infinity,
        maxFallSpeed: 20,
      },
      sprintBoost: 1.5,
      cameraDistance: 5,
      cameraHeight: 0,
    });

    // Wait for user to start
    this.controls.active = false;

    // Reveal the scene now that camera and controls are set up
    await reveal();

    // Reset store state
    gameStore.update({
      started: false,
      paused: false,
    });

    // Register space event handlers
    this.cleanup = this.space.use({
      onUpdate: this.onUpdate,
      onDispose: this.onDispose,
    });
  }

  dispose() {
    // Clean up space event handlers
    this.cleanup?.();
    this.cleanup = null;

    this.controls?.dispose();
    this.controls = null;

    // Destroy the space
    this.space?.destroy();
    this.space = null;
    scriptInstance = null;
  }

  start() {
    if (!this.space) return;

    if (this.controls) {
      this.controls.active = true;
    }

    setStarted(true);
    this.space.start();
  }

  togglePause() {
    if (!this.space) return;

    const currentPaused = gameStore.state.paused;

    if (currentPaused) {
      // Resume
      if (this.controls) {
        this.controls.active = true;
      }
      this.space.start();
      setPaused(false);
    } else {
      // Pause
      if (this.controls) {
        this.controls.active = false;
      }
      this.space.stop();
      setPaused(true);
    }
  }

  // Called every frame when game is running (via space.use)
  onUpdate = (dt: number) => {
    // Game update logic can go here
  };

  onDispose = () => {
    console.log("[Game] Game disposed");
  };
}
