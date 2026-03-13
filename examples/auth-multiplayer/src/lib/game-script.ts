import type { Room } from "@colyseus/sdk";
import {
  Camera,
  type Component3D,
  type Space,
  AvatarComponent,
} from "@oncyberio/engine";
import { createGame } from "@/lib/utils";
import {
  createNetPlatformer,
  type NetPlatformerControlSystem,
} from "../../shared/net-platformer";
import { gameStore, setStarted, setPaused } from "@/lib/game-store";
import { connectToRoom, disconnectFromRoom } from "@/multiplayer/client";
import {
  createPlayersReplica,
  type PlayersReplica,
} from "@/multiplayer/players-replica";
import {
  PLAYER_ANIMATION_MESSAGE,
  PLAYER_COMMAND_MESSAGE,
  PLAYER_SNAPSHOT_MESSAGE,
  isPlayerSnapshotMessage,
} from "../../shared/messages";
import { SIMULATION_TICK_INTERVAL } from "../../shared/network-constants";
import {
  multiplayerNetPlatformerOptions,
  multiplayerReconciliationOptions,
  serverPlayerColliderOffset,
  serverPlayerBodyDimensions,
} from "../../shared/net-platformer-options";

// Module-level reference for external control
let scriptInstance: GameScript | null = null;

function createLocalPlayerBodyData(
  avatar: AvatarComponent,
): Record<string, unknown> {
  return {
    id: "local-player-body",
    name: "Local Player Body",
    type: "mesh",
    display: false,
    displayInEditor: false,
    position: {
      x: avatar.position.x,
      y: avatar.position.y,
      z: avatar.position.z,
    },
    rotation: {
      x: avatar.rotation.x,
      y: avatar.rotation.y,
      z: avatar.rotation.z,
    },
    scale: { x: 1, y: 1, z: 1 },
    geometry: {
      type: "box",
      boxParams: { ...serverPlayerBodyDimensions },
      sphereParams: {
        radius: 1,
        widthSegments: 8,
        heightSegments: 8,
      },
      cylinderParams: {
        radiusTop: 1,
        radiusBottom: 1,
        height: 1,
        radialSegments: 8,
        heightSegments: 1,
        openEnded: false,
      },
    },
    collider: {
      enabled: true,
      rigidbodyType: "PLAYER",
      colliderType: "CAPSULE",
      position: { ...serverPlayerColliderOffset },
    },
    script: {
      identifier: "local-player-body",
      _isPlayer: true,
    },
    _IS_PLAYER: true,
  };
}

export function startGame() {
  scriptInstance?.start();
}

export function togglePause() {
  scriptInstance?.togglePause();
}

export class GameScript {
  private space: Space | null = null;
  private controls: NetPlatformerControlSystem | null = null;
  private cleanup: (() => void) | null = null;
  private playersReplica: PlayersReplica | null = null;
  private room: Room<any> | null = null;
  private localAvatar: AvatarComponent | null = null;
  private localPlayerBody: Component3D | null = null;
  private offSnapshotMessage: (() => void) | null = null;
  private lastSentCommandSequence = 0;
  private lastSentAnimation = "";

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
      this.offSnapshotMessage = room.onMessage(
        PLAYER_SNAPSHOT_MESSAGE,
        this.onAuthoritativeSnapshot,
      );
      console.log("[MP] Connected, sessionId:", room.sessionId);

      this.playersReplica = createPlayersReplica(
        room,
        this.space,
        playerTemplate.data as AvatarComponent["data"],
      );
      this.playersReplica.init();

      const playerAvatar = await this.playersReplica.whenLocalComponentReady();
      this.localAvatar = playerAvatar;
      this.localPlayerBody = (await this.space.components.create(
        createLocalPlayerBodyData(playerAvatar) as any,
      )) as Component3D;
      playerTemplate.destroy();

      this.controls = createNetPlatformer(
        this.space,
        playerAvatar,
        Camera.current,
        {
          ...multiplayerNetPlatformerOptions,
          movementBody: this.localPlayerBody,
        },
      );

      this.controls.active = false;

      gameStore.update({
        started: false,
        paused: false,
      });

      this.cleanup = this.space.use({
        onFixedUpdate: this.onFixedUpdate,
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
    this.offSnapshotMessage?.();
    this.offSnapshotMessage = null;
    this.room = null;
    this.localAvatar = null;
    this.lastSentCommandSequence = 0;
    this.lastSentAnimation = "";
    disconnectFromRoom();

    // Clean up space event handlers
    this.cleanup?.();
    this.cleanup = null;

    this.controls?.dispose();
    this.controls = null;
    this.localPlayerBody?.destroy();
    this.localPlayerBody = null;

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
      this.sendLocalAnimationState();
      this.space.stop();
      setPaused(true);
    }
  }

  // Called every frame when game is running (via space.use)
  onUpdate = (dt: number) => {
    this.playersReplica?.update(dt);
  };

  onFixedUpdate = () => {
    this.sendLocalCommandFrame();
    this.sendLocalAnimationState();
  };

  onDispose = () => {
    console.log("[Game] Game disposed");
  };

  private sendLocalCommandFrame(): void {
    if (!this.room || !this.controls || !this.controls.active) return;

    const commandFrame = this.controls.readCommandFrame();
    if (commandFrame.sequence <= this.lastSentCommandSequence) {
      return;
    }

    this.lastSentCommandSequence = commandFrame.sequence;
    this.room.send(PLAYER_COMMAND_MESSAGE, commandFrame);
  }

  private onAuthoritativeSnapshot = (payload: unknown): void => {
    if (!this.room || !this.controls || !isPlayerSnapshotMessage(payload)) {
      return;
    }

    if (payload.sessionId !== this.room.sessionId) {
      return;
    }

    this.controls.reconcile(
      payload.acknowledgement,
      payload.authoritativeCheckpoint,
      SIMULATION_TICK_INTERVAL / 1000,
      multiplayerReconciliationOptions,
    );
  };

  private sendLocalAnimationState(): void {
    if (!this.room || !this.localAvatar) return;

    const animation = this.localAvatar.data.animation || "idle";
    if (animation === this.lastSentAnimation) {
      return;
    }

    this.lastSentAnimation = animation;
    this.room.send(PLAYER_ANIMATION_MESSAGE, { animation });
  }
}
