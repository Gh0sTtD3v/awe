import type { Room } from "@colyseus/sdk";
import { Camera, type Space, AvatarComponent } from "@oncyberio/engine";
import { createGame } from "@/lib/utils";
import {
  createPlatformer,
  type ControlSystem,
} from "@oncyber/game-utils/control-presets";
import { gameStore, setStarted, setPaused } from "@/lib/game-store";
import { connectToRoom, disconnectFromRoom } from "@/multiplayer/client";
import {
  createPlayersReplica,
  type PlayersReplica,
} from "@/multiplayer/players-replica";
import { PLAYER_UPDATE_MESSAGE } from "../../shared/messages";
import { NETWORK_TICK_INTERVAL } from "../../shared/network-constants";

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
  private playersReplica: PlayersReplica | null = null;
  private room: Room<any> | null = null;
  private localPlayerAvatar: AvatarComponent | null = null;
  private timeSinceLastBroadcast = 0;

  /**
   * Initialize the game scene.
   * Returns when space is fully loaded and ready.
   */
  async init() {
    scriptInstance = this;
    try {
      // Create space - returns when fully loaded
      const { space, reveal } = await createGame({ baseUrl: "" });
      this.space = space;

      const playerTemplate = this.space.components.byId(
        "player",
      ) as AvatarComponent | null;
      if (!playerTemplate) {
        throw new Error("[Game] Player avatar template not found");
      }

      const room = await connectToRoom();
      this.room = room;
      console.log("[MP] Connected, sessionId:", room.sessionId);

      this.playersReplica = createPlayersReplica(
        room,
        this.space,
        playerTemplate.data as AvatarComponent["data"],
      );
      this.playersReplica.init();

      const playerAvatar = await this.playersReplica.whenLocalComponentReady();
      this.localPlayerAvatar = playerAvatar;

      playerTemplate.destroy();

      this.controls = createPlatformer(
        this.space,
        playerAvatar,
        Camera.current,
        {
          movement: { speed: 10, gravity: -1.81 },
          jump: {
            height: 4,
            duration: 1,
            maxJumps: 2,
            coyoteTime: Infinity,
            maxFallSpeed: 20,
          },
          sprintBoost: 1.5,
          cameraDistance: 5,
          cameraHeight: 0,
          cameraSmoothing: 0.2,
          cameraMode: "orbit",
        },
      );

      this.controls.active = false;

      gameStore.update({
        started: false,
        paused: false,
      });

      this.cleanup = this.space.use({
        onUpdate: this.onUpdate,
        onDispose: this.onDispose,
      });

      await reveal();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose() {
    // Disconnect from multiplayer
    this.playersReplica?.dispose();
    this.playersReplica = null;
    this.room = null;
    this.localPlayerAvatar = null;
    this.timeSinceLastBroadcast = 0;
    disconnectFromRoom();

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
    this.playersReplica?.update(dt);
    this.broadcastLocalPlayerState(dt);
  };

  onDispose = () => {
    console.log("[Game] Game disposed");
  };

  private broadcastLocalPlayerState(dt: number): void {
    if (!this.room || !this.localPlayerAvatar) return;

    const avatar = this.localPlayerAvatar;
    this.timeSinceLastBroadcast += dt * 1000;

    while (this.timeSinceLastBroadcast >= NETWORK_TICK_INTERVAL) {
      this.timeSinceLastBroadcast -= NETWORK_TICK_INTERVAL;

      this.room.send(PLAYER_UPDATE_MESSAGE, {
        x: avatar.position.x,
        y: avatar.position.y,
        z: avatar.position.z,
        rotY: avatar.rotation.y,
        anim: avatar.data?.animation ?? "idle",
      });

      if (this.timeSinceLastBroadcast > NETWORK_TICK_INTERVAL * 4) {
        this.timeSinceLastBroadcast = 0;
        break;
      }
    }
  }
}
