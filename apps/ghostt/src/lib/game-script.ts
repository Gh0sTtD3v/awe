import type { Room } from "@colyseus/sdk";
import {
  Camera,
  type Space,
  AvatarComponent,
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Custom,
  Interactions,
  Processors,
  withProcessors,
} from "@oncyberio/engine";
import {
  Mover,
  FlyCameraRig,
  ThirdPersonCameraRig,
  createMoverAnimStateMachine,
} from "@oncyberio/engine/controls";
import type { MoverAnimLocomotionState } from "@oncyberio/engine/controls";
import { Quaternion, Vector3 } from "three";
import { createGame } from "@/lib/utils";
import { gameStore, setStarted, setPaused, setFlying, setFast, setUiHidden, showModeNotice } from "@/lib/game-store";
import { loadPortals } from "@/lib/portals";
import { findPlotEntry, readPlotParam } from "@/lib/plots";
import {
  setPortals,
  setPlayers,
  setChunk,
  openInfo,
  infoStore,
  showGateNotice,
  setSelfAccess,
  setRemoved,
  showModMessage,
  setNearLift,
  setNearSeat,
  setSeated,
  type PlayerInfo,
} from "@/lib/info-store";
import { getAccessToken } from "@/lib/auth-bridge";
import { ScreenSync } from "@/lib/screen-sync";
import { VoiceClient } from "@/lib/voice-client";
import { ChatBubbles } from "@/lib/chat-bubbles";
import { connectToRoom, disconnectFromRoom } from "@/multiplayer/client";
import {
  createPlayersReplica,
  type PlayersReplica,
} from "@/multiplayer/players-replica";
import { posToChunkKey } from "@oncyberio/world-config";
import {
  ACCESS_SELF_MESSAGE,
  AUTH_UPDATE_MESSAGE,
  BANNED_CLOSE_CODE,
  CHUNK_DENIED_MESSAGE,
  GATE_ACCESS_MESSAGE,
  GATE_DENIED_MESSAGE,
  KICKED_CLOSE_CODE,
  MOD_BAN_MESSAGE,
  MOD_KICK_MESSAGE,
  MOD_MUTE_MESSAGE,
  VOICE_BROADCAST_MESSAGE,
  MOD_RESULT_MESSAGE,
  PLAYER_UPDATE_MESSAGE,
  type AccessSelfMessage,
  type ChunkDeniedMessage,
  type GateAccessMessage,
  type GateDeniedMessage,
  type ModResultMessage,
  CHAT_MESSAGE,
  CHAT_REFUSED_MESSAGE,
  CHAT_ROOM_MESSAGE,
  CHAT_SEND_MESSAGE,
  type ChatMessage,
  type ChatRefusedMessage,
  type ChatRoomMessage,
} from "../../shared/messages";
import { addChatMessage, setChatError, setChatRoom } from "./chat-store";
import { describeRequirement, gateFromComponent, pointInGate } from "../../shared/gates";
import { floorsOf, liftAt, liftFromComponent, type LiftDef } from "../../shared/lifts";
import { seatFromComponent, seatNear, type SeatDef } from "../../shared/seats";
import { gravityZoneAt, gravityZoneFromComponent, nextSpeed, targetSpeed, type GravityZoneDef } from "../../shared/gravity-zones";
import { musicZoneFromComponent, type MusicZoneDef } from "../../shared/music-zones";
import { MusicPlayer } from "@/lib/music-player";
import { NETWORK_TICK_INTERVAL } from "../../shared/network-constants";
import { mayControlScreen, type ScreenAction } from "../../shared/screens";

// --- Input definitions ---
const GAMEPLAY_INPUTS = {
  Move: {
    type: "vector2" as const,
    bindings: [
      Keyboard.wasd(),
      Keyboard.arrows(),
      Gamepad.leftStick(),
      Gamepad.dpad(),
      Touch.joystick(),
    ],
  },
  Look: {
    type: "vector2" as const,
    bindings: [
      Mouse.pointerLockDelta(),
      withProcessors(Touch.delta(), Processors.scaleVector2(-1)),
      Gamepad.rightStick(),
    ],
  },
  Zoom: {
    type: "value" as const,
    bindings: [Mouse.wheel()],
  },
  Jump: {
    type: "button" as const,
    bindings: [
      Keyboard.button("Space"),
      Gamepad.button("A"),
      Custom.button("jump"),
    ],
    interactions: [Interactions.press()],
  },
  // Minecraft-style: Space jumps (and rises while flying), Shift descends,
  // K toggles flying, J toggles fast.
  Down: {
    type: "button" as const,
    bindings: [
      Keyboard.button("ShiftLeft"),
      Keyboard.button("ShiftRight"),
      Gamepad.button("LB"),
      Custom.button("down"),
    ],
  },
  ToggleFly: {
    type: "button" as const,
    bindings: [Keyboard.button("KeyK"), Custom.button("fly")],
    interactions: [Interactions.press()],
  },
  ToggleFast: {
    type: "button" as const,
    bindings: [Keyboard.button("KeyJ"), Custom.button("fast")],
    interactions: [Interactions.press()],
  },
  // Cinematic mode (X): the camera detaches and flies; +/- set its speed.
  ToggleCinematic: {
    type: "button" as const,
    bindings: [Keyboard.button("KeyX")],
    interactions: [Interactions.press()],
  },
  CameraFaster: {
    type: "button" as const,
    bindings: [Keyboard.button("Equal"), Keyboard.button("NumpadAdd")],
    interactions: [Interactions.press()],
  },
  CameraSlower: {
    type: "button" as const,
    bindings: [Keyboard.button("Minus"), Keyboard.button("NumpadSubtract")],
    interactions: [Interactions.press()],
  },
  // V: hide all UI, for clean recordings.
  ToggleUI: {
    type: "button" as const,
    bindings: [Keyboard.button("KeyV")],
    interactions: [Interactions.press()],
  },
} as const;

// --- Animation clip names ---
const ANIMS = {
  idle: "idle",
  walk: "walk",
  run: "run",
  sprint: "sprint",
  jump_idle: "jump_idle",
  jump_walking: "jump_walking",
  jump_running: "jump_running",
  jump_sprinting: "jump_sprinting",
  jump_double: "jump_double",
  falling: "falling",
  drop_idle: "drop_idle",
  drop_walking: "drop_walking",
  drop_walking_roll: "drop_walking_roll",
  drop_running: "drop_running",
  drop_running_roll: "drop_running_roll",
  drop_sprinting: "drop_sprinting",
  drop_sprinting_roll: "drop_sprinting_roll",
};

function getJumpClip(state: MoverAnimLocomotionState): string {
  switch (state) {
    case "walk":
      return ANIMS.jump_walking;
    case "run":
      return ANIMS.jump_running;
    case "sprint":
      return ANIMS.jump_sprinting;
    default:
      return ANIMS.jump_idle;
  }
}

function getLandingClip(
  state: MoverAnimLocomotionState,
  velocityY: number,
): string {
  const roll = velocityY < -0.6;
  switch (state) {
    case "walk":
      return roll ? ANIMS.drop_walking_roll : ANIMS.drop_walking;
    case "run":
      return roll ? ANIMS.drop_running_roll : ANIMS.drop_running;
    case "sprint":
      return roll ? ANIMS.drop_sprinting_roll : ANIMS.drop_sprinting;
    default:
      return ANIMS.drop_idle;
  }
}

// --- Movement tuning ---
const SPEED = 10;
const FAST_BOOST = 1.5;
/** Fast mode while flying. */
const FLY_FAST_BOOST = 10;
const ACCELERATION = 100;
const DECELERATION = 50;
/** ThirdPersonCameraRig's default; near zero while flying so the camera keeps up vertically. */
const CAMERA_ALTITUDE_SMOOTHING = 0.17;
const FLYING_ALTITUDE_SMOOTHING = 0.01;
/** Cinematic camera speeds in m/s, from a slow creep to quite fast. */
const CINEMATIC_SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
const CINEMATIC_DEFAULT_SPEED = 4; // index into CINEMATIC_SPEEDS (4 m/s)
const GRAVITY = -1.81;
const FLY_VERTICAL_SPEED = 8;
/** Music is heard from about head height above the avatar's feet (m). */
const LISTENER_HEIGHT = 1.5;

/** Fallback when the mesh can't be measured: hip joint height above the seat, in metres. */
const HIPS_ABOVE_SEAT = 0.1;
/** Frames to wait after starting the sitting clip before measuring the pose. */
const SETTLE_FRAMES = 3;
/** Bones whose skin forms what rests on a seat: the backside and thighs. */
const SEATED_BONES = /(hips|upleg|upperleg)$/i;

/**
 * The avatar's VRM model. It is not a child of the avatar component: it lives
 * in its own group that follows the component every frame.
 */
function avatarModel(avatar: any): any {
  return avatar?._avatar?.vrm?.vrm ?? null;
}

function findHips(model: any): any {
  let found: any = null;
  model?.traverse((o: any) => {
    if (!found && o.isBone && /hips/i.test(o.name)) found = o;
  });
  return found;
}

/**
 * World height of the lowest point of the backside and thighs in the current
 * pose: vertices skinned mostly to the hips or upper legs. Null if the model
 * has no skinned mesh to measure.
 */
function lowestSeatedPoint(model: any): number | null {
  let minY = Infinity;
  const v = new Vector3();
  model?.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.visible) return;
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    if (!position || !skinIndex || !skinWeight) return;
    const seatedBone = mesh.skeleton.bones.map((b: any) => SEATED_BONES.test(b.name));
    for (let i = 0; i < position.count; i++) {
      // The bone with the most influence on this vertex.
      let best = 0;
      for (let k = 1; k < 4; k++) if (skinWeight.getComponent(i, k) > skinWeight.getComponent(i, best)) best = k;
      if (!seatedBone[skinIndex.getComponent(i, best)]) continue;
      v.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      if (v.y < minY) minY = v.y;
    }
  });
  return Number.isFinite(minY) ? minY : null;
}

// Module-level reference for external control
let scriptInstance: GameScript | null = null;

export function startGame() {
  scriptInstance?.start();
}

export function togglePause() {
  scriptInstance?.togglePause();
}

/** Access the running game script from UI code. */
export function getScript(): GameScript | null {
  return scriptInstance;
}

/** `?previewRole=<id>`, set by the studio's "preview as role" buttons. */
export function previewRoleFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("previewRole") || null;
}

// How often (ms) to push player/chunk snapshots to the info UI store.
const INFO_SYNC_INTERVAL = 200;

// After landing at an exit, server denials for positions sent before the
// teleport can still be in flight. Ignore those for this long; walking back
// into the gate is still caught at once by the local sensor.
const GATE_DENIAL_GRACE = 400;

export class GameScript {
  private space: Space | null = null;
  private cleanup: (() => void) | null = null;
  private playersReplica: PlayersReplica | null = null;
  private room: Room<any> | null = null;
  private localPlayerAvatar: AvatarComponent | null = null;
  private timeSinceLastBroadcast = 0;
  private portalCleanup: (() => void) | null = null;
  private gateCleanup: (() => void) | null = null;
  private timeSinceInfoSync = 0;
  private screenSync: ScreenSync | null = null;
  private voice: VoiceClient | null = null;
  private chatBubbles: ChatBubbles | null = null;

  /** gateId → may enter, as decided by the server. Missing means no. */
  private gateAccess: Record<string, boolean> = {};
  /** Members-only chunks by key → may enter. Missing = public. */
  private chunkAccess: Record<string, boolean> = {};
  /** True while we're being moved out of a gate or members-only chunk. */
  private leavingRestricted = false;
  private leftRestrictedAt = -Infinity;

  // Control primitives
  private inputs: ReturnType<typeof createInputs<typeof GAMEPLAY_INPUTS>> | null = null;
  private cameraRig: ThirdPersonCameraRig | null = null;
  /** Set while in cinematic mode: a free camera, with the avatar left where it stood. */
  private cinematicRig: FlyCameraRig | null = null;
  private cinematicSpeed = CINEMATIC_DEFAULT_SPEED;
  /** Where the follow camera was, to return to on leaving cinematic mode. */
  private cameraBeforeCinematic: { position: Vector3; quaternion: Quaternion } | null = null;
  private mover: Mover | null = null;
  private animStateMachine: ReturnType<typeof createMoverAnimStateMachine> | null = null;
  private controlsActive = false;
  private flying = false;
  private fast = false;
  /** Set while sitting: where the player stood before, to return to on standing up. */
  private seatedFrom: Vector3 | null = null;
  /** Just sat down: frames left before the hips are measured. */
  private settling: { seat: SeatDef; frames: number } | null = null;
  /** True while a reverse gravity zone is carrying the player (gravity is off). */
  private inGravityZone = false;
  /** Plays and fades the music of music zones. */
  private music = new MusicPlayer();

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

      let room: Room<any>;
      try {
        room = await connectToRoom(await getAccessToken(), previewRoleFromUrl());
      } catch (err: any) {
        if (err?.code === BANNED_CLOSE_CODE) setRemoved("You are banned from this world.");
        throw err;
      }
      this.room = room;
      console.log("[MP] Connected, sessionId:", room.sessionId);

      // Token gates: the server decides; we open doors and show the way out.
      room.onMessage(GATE_ACCESS_MESSAGE, (msg: GateAccessMessage) => {
        this.gateAccess = msg.access ?? {};
        this.applyGateDoors();
      });
      room.onMessage(GATE_DENIED_MESSAGE, (msg: GateDeniedMessage) => {
        void this.leaveGate(msg.exit, msg.label, msg.requirement, "server");
      });

      // Roles: what we may do, and members-only chunks we were turned away from.
      room.onMessage(ACCESS_SELF_MESSAGE, (msg: AccessSelfMessage) => {
        this.chunkAccess = msg.chunks ?? {};
        setSelfAccess({
          isOwner: msg.isOwner,
          permissions: msg.permissions ?? [],
          rolePosition: msg.rolePosition ?? 0,
          preview: msg.preview ?? null,
        });
        this.voice?.setCanSpeak((msg.permissions ?? []).includes("speak"));
        // Lost the permission mid-flight: land.
        if (!this.mayFly()) this.setFlyingState(false);
      });
      room.onMessage(CHUNK_DENIED_MESSAGE, (msg: ChunkDeniedMessage) => {
        this.chunkAccess[msg.chunkKey] = false;
        void this.leaveRestricted(msg.exit, msg.title, msg.roles.join(", "), "chunk", "server");
      });
      room.onMessage(MOD_RESULT_MESSAGE, (msg: ModResultMessage) => {
        showModMessage(msg.ok ? "Done." : (msg.error ?? "Refused."));
      });

      // Text chat: only what arrives while we're here. Nothing is fetched or kept.
      // ...and a bubble over the speaker's head.
      this.chatBubbles = new ChatBubbles(this.space);
      room.onMessage(CHAT_MESSAGE, (msg: ChatMessage) => {
        addChatMessage(msg);
        this.chatBubbles?.show(msg);
      });
      room.onMessage(CHAT_ROOM_MESSAGE, (msg: ChatRoomMessage) => setChatRoom(msg.room));
      room.onMessage(CHAT_REFUSED_MESSAGE, (msg: ChatRefusedMessage) => setChatError(msg.error));
      room.onLeave((code: number) => {
        if (code === KICKED_CLOSE_CODE) setRemoved("You were removed by a moderator.");
        if (code === BANNED_CLOSE_CODE) setRemoved("You are banned from this world.");
      });

      // Video screens follow the playback the server shares.
      this.screenSync = new ScreenSync(room, this.space, (gate) => {
        const perms = infoStore.state.self?.permissions ?? [];
        return mayControlScreen(gate, perms.includes("control_screens"), this.gateAccess);
      });
      // Proximity voice: the server pairs nearby players, audio goes peer to peer.
      this.voice = new VoiceClient(room, this.space);

      this.playersReplica = createPlayersReplica(
        room,
        this.space,
        playerTemplate.data as AvatarComponent["data"],
      );
      this.playersReplica.init();

      const playerAvatar = await this.playersReplica.whenLocalComponentReady();
      this.localPlayerAvatar = playerAvatar;

      playerTemplate.destroy();

      // Input system
      this.inputs = createInputs(GAMEPLAY_INPUTS);

      // Camera rig
      this.cameraRig = new ThirdPersonCameraRig({
        camera: Camera.current,
        target: playerAvatar,
        distance: 5,
        height: 0,
        collision: true,
        smoothing: 0.2,
        smoothMethod: "orbit",
      });

      // Mover
      this.mover = new Mover({
        body: playerAvatar,
        target: Camera.current,
        movement: {
          speed: SPEED,
          gravity: GRAVITY,
          acceleration: ACCELERATION,
          deceleration: DECELERATION,
          airControl: 1,
          facingMode: "movement",
        },
        jump: {
          height: 4,
          duration: 1,
          maxJumps: 2,
          coyoteTime: Infinity,
          maxFallSpeed: 20,
        },
      });

      // Animation state machine
      this.animStateMachine = createMoverAnimStateMachine({
        body: playerAvatar,
        mover: this.mover,
        defaultBlendTime: 0.1,
        locomotionClips: {
          idle: ANIMS.idle,
          walk: ANIMS.walk,
          run: ANIMS.run,
          sprint: ANIMS.sprint,
        },
        locomotionThresholds: { walk: 10, sprint: SPEED * FAST_BOOST },
        jump: {
          clip: (ctx) => getJumpClip(ctx.jumpTakeoffState),
          toFallWhen: (ctx) => ctx.finished && !ctx.mover.grounded,
        },
        doubleJump: { clip: ANIMS.jump_double },
        fall: { clip: ANIMS.falling },
        landing: {
          clip: (ctx) =>
            getLandingClip(ctx.jumpTakeoffState, ctx.landingVelocityY),
        },
      });

      // Wire jump input
      this.inputs.Jump.onPerformed(() => {
        if (!this.flying && !this.cinematicRig) this.mover?.startJump();
      });
      this.inputs.ToggleCinematic.onPerformed(() => this.toggleCinematic());
      this.inputs.CameraFaster.onPerformed(() => this.changeCinematicSpeed(1));
      this.inputs.CameraSlower.onPerformed(() => this.changeCinematicSpeed(-1));
      this.inputs.ToggleUI.onPerformed(() => setUiHidden(!gameStore.state.uiHidden));
      this.inputs.ToggleFly.onPerformed(() => this.toggleFly());
      this.inputs.ToggleFast.onPerformed(() => this.toggleFast());

      this.setActive(false);

      gameStore.update({
        started: false,
        paused: false,
      });

      this.cleanup = this.space.use({
        onFixedUpdate: this.onFixedUpdate,
        onUpdate: this.onUpdate,
        onDispose: this.onDispose,
      });

      // Populate the destination directory ("yellowpages").
      loadPortals().then(setPortals);

      // Entering a portal opens the directory on the Destinations tab.
      this.portalCleanup = this.space._onEngineEvent("portal_open", () => {
        openInfo("destinations");
        try {
          document.exitPointerLock();
        } catch {
          // ignore
        }
      });

      // Fast local fallback: don't wait for the server round-trip to turn a
      // player without access around. The server still enforces it.
      this.gateCleanup = this.space._onEngineEvent(
        "token_gate_enter",
        ({ gateId, avatar }) => {
          if (avatar !== this.localPlayerAvatar) return;
          if (this.gateAccess[gateId] === true) return;

          const gate = gateFromComponent(this.space?.components.byId(gateId)?.data);
          if (!gate) return;
          void this.leaveGate(gate.exit, gate.label, describeRequirement(gate.requirement), "local");
        },
      );

      // Keep the intro up until the chunk we spawn in has streamed in, so the
      // world doesn't build itself in front of the player.
      const chunks = this.space.chunks;
      if (chunks && !(await this.enterLinkedPlot())) {
        const p = playerAvatar.position;
        await chunks.loadChunk(posToChunkKey({ x: p.x, y: p.y, z: p.z }));
      }

      await reveal();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose() {
    // Disconnect from multiplayer
    this.screenSync?.dispose();
    this.screenSync = null;
    this.voice?.dispose();
    this.chatBubbles?.dispose();
    this.chatBubbles = null;
    this.voice = null;
    this.playersReplica?.dispose();
    this.playersReplica = null;
    this.room = null;
    this.localPlayerAvatar = null;
    this.timeSinceLastBroadcast = 0;
    disconnectFromRoom();

    this.portalCleanup?.();
    this.portalCleanup = null;
    this.gateCleanup?.();
    this.gateCleanup = null;
    this.gateAccess = {};

    // Clean up space event handlers
    this.cleanup?.();
    this.cleanup = null;

    this.animStateMachine?.dispose();
    this.animStateMachine = null;
    this.mover?.dispose();
    this.mover = null;
    this.setCinematic(false);
    this.cameraRig?.dispose();
    this.cameraRig = null;
    this.inputs?.dispose();
    this.inputs = null;

    this.music.dispose();

    // Destroy the space
    this.space?.destroy();
    this.space = null;
    scriptInstance = null;
  }

  private setActive(val: boolean) {
    this.controlsActive = val;
    if (val) {
      this.inputs?.enable();
      this.mover?.reset();
      this.animStateMachine?.forceState("idle");
    } else {
      this.standUp();
      this.inputs?.disable();
      this.setFlyingState(false);
      this.setCinematic(false);
      this.animStateMachine?.forceState("idle");
    }
    if (this.cameraRig) this.cameraRig.active = val;
    if (this.animStateMachine) this.animStateMachine.enabled = val;
  }

  toggleCinematic(): void {
    this.setCinematic(!this.cinematicRig);
    showModeNotice(this.cinematicRig ? "CINEMATIC MODE ON" : "CINEMATIC MODE OFF");
  }

  private changeCinematicSpeed(step: number): void {
    if (!this.cinematicRig) return;
    this.cinematicSpeed = Math.max(0, Math.min(CINEMATIC_SPEEDS.length - 1, this.cinematicSpeed + step));
    this.cinematicRig.moveSpeed = CINEMATIC_SPEEDS[this.cinematicSpeed];
    showModeNotice(`CAMERA SPEED ${CINEMATIC_SPEEDS[this.cinematicSpeed]} M/S`);
  }

  private setCinematic(on: boolean): void {
    if (!!this.cinematicRig === on) return;
    const camera = Camera.current;

    if (on) {
      this.standUp();
      this.cameraBeforeCinematic = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
      };
      if (this.cameraRig) this.cameraRig.active = false;
      // Forward/back follow the camera's full direction (pitch included);
      // up/down move along the world's vertical axis.
      this.cinematicRig = new FlyCameraRig({
        camera,
        moveSpeed: CINEMATIC_SPEEDS[this.cinematicSpeed],
        // The follow rig owns pointer lock; disposing a rig that owns it
        // would release the mouse when leaving cinematic mode.
        usePointerLock: false,
      });
      return;
    }

    this.cinematicRig?.dispose();
    this.cinematicRig = null;
    // Put the camera back behind the avatar before the follow rig takes over;
    // it measures its orbit from wherever the camera is.
    if (this.cameraBeforeCinematic) {
      camera.position.copy(this.cameraBeforeCinematic.position);
      camera.quaternion.copy(this.cameraBeforeCinematic.quaternion);
      this.cameraBeforeCinematic = null;
    }
    if (this.cameraRig) this.cameraRig.active = this.controlsActive;
  }

  /** Fly mode needs the `fly` permission (owner and administrators always have it). */
  mayFly(): boolean {
    return (infoStore.state.self?.permissions ?? []).includes("fly");
  }

  toggleFly(): void {
    if (!this.flying && !this.mayFly()) {
      showModeNotice("FLYING NOT ALLOWED");
      return;
    }
    this.standUp();
    this.setFlyingState(!this.flying);
    showModeNotice(this.flying ? "FLY MODE ON" : "FLY MODE OFF");
  }

  toggleFast(): void {
    this.fast = !this.fast;
    setFast(this.fast);
    showModeNotice(this.fast ? "FAST MODE ON" : "FAST MODE OFF");
  }

  private setFlyingState(on: boolean): void {
    if (this.flying === on) return;
    this.flying = on;
    setFlying(on);
    if (this.cameraRig) {
      this.cameraRig.altitudeSmoothing = on ? FLYING_ALTITUDE_SMOOTHING : CAMERA_ALTITUDE_SMOOTHING;
    }
    if (!this.mover) return;
    this.mover.gravity = on ? 0 : GRAVITY;
    const v = this.mover.velocity;
    v.y = 0;
    this.mover.setVelocity(v);
  }

  start() {
    if (!this.space) return;

    this.setActive(true);
    setStarted(true);
    this.space.start();
  }

  togglePause() {
    if (!this.space) return;

    const currentPaused = gameStore.state.paused;

    if (currentPaused) {
      // Resume
      this.setActive(true);
      this.space.start();
      setPaused(false);
    } else {
      // Pause
      this.setActive(false);
      this.space.stop();
      setPaused(true);
    }
  }

  // Called on fixed timestep for physics (via space.use)
  onFixedUpdate = (dt: number) => {
    if (!this.controlsActive || !this.inputs || !this.mover) return;

    this.inputs.update(dt);

    const moveDir = this.inputs.Move.readValue();

    if (this.seatedFrom) {
      // Sitting: the camera still orbits; moving or jumping stands up.
      const look = this.inputs.Look.readValue();
      this.cameraRig?.rotate(look.x, look.y);
      this.cameraRig?.zoom(this.inputs.Zoom.readValue() * 0.1);
      if (Math.hypot(moveDir.x, moveDir.y) > 0.5 || this.inputs.Jump.wasJustPressed) this.standUp();
      return;
    }

    const boost = this.fast ? (this.flying ? FLY_FAST_BOOST : FAST_BOOST) : 1;
    const speed = SPEED * boost;
    // Speed up and slow down in the same time at any speed (no long glide at 10x).
    this.mover.acceleration = ACCELERATION * boost;
    this.mover.deceleration = DECELERATION * boost;

    const up = this.inputs.Jump.isPressed;
    const down = this.inputs.Down.isPressed;

    if (this.cinematicRig) {
      // The camera flies (it handles mouse look itself); the avatar stays put.
      const a = this.cinematicRig.actions;
      a.forward = moveDir.y > 0.1;
      a.backward = moveDir.y < -0.1;
      a.right = moveDir.x > 0.1;
      a.left = moveDir.x < -0.1;
      a.up = up;
      a.down = down;
      this.mover.move(0, 0, speed);
      if (this.flying) {
        const v = this.mover.velocity;
        v.y = 0;
        this.mover.setVelocity(v);
      }
      const carried = this.applyGravityZone(dt);
      this.mover.update(dt);
      this.updateAnimation(dt, this.flying || (carried && !this.mover.grounded));
      return;
    }

    const lookDelta = this.inputs.Look.readValue();
    const zoomDelta = this.inputs.Zoom.readValue();

    this.cameraRig?.rotate(lookDelta.x, lookDelta.y);
    this.cameraRig?.zoom(zoomDelta * 0.1);
    this.mover.move(moveDir.x, moveDir.y, speed);

    if (this.flying) {
      // Gravity is off; we set the climb rate ourselves (per-step, like the mover's x/z).
      const climb = (up ? 1 : 0) - (down ? 1 : 0);
      const v = this.mover.velocity;
      v.y = climb * FLY_VERTICAL_SPEED * boost * dt;
      this.mover.setVelocity(v);
    } else if (this.inputs.Jump.wasJustPressed) {
      this.mover.startJump();
    }

    const carried = this.applyGravityZone(dt);
    this.mover.update(dt);
    // Floating in a zone holds idle, like hovering in fly mode.
    this.updateAnimation(dt, (this.flying && !this.mover.isMoving) || (carried && !this.mover.grounded));
  };

  /** Reverse gravity zones in the loaded chunks. */
  private gravityZones(): GravityZoneDef[] {
    const out: GravityZoneDef[] = [];
    for (const c of this.space?.components.byType("gravity-zone") ?? []) {
      const zone = gravityZoneFromComponent(c.data);
      if (zone) out.push(zone);
    }
    return out;
  }

  /**
   * Inside a reverse gravity zone (and not flying), normal gravity is off and
   * the player's vertical speed follows the zone: rising at a positive
   * strength, falling slowly at a negative one. Returns true while the zone
   * is in control.
   */
  private applyGravityZone(dt: number): boolean {
    const mover = this.mover;
    const pos = this.localPlayerAvatar?.position;
    const zone = !this.flying && pos && dt > 0 ? gravityZoneAt(this.gravityZones(), pos) : null;

    if (!zone) {
      if (this.inGravityZone) {
        this.inGravityZone = false;
        if (mover && !this.flying) mover.gravity = GRAVITY;
      }
      return false;
    }
    if (!mover) return false;

    this.inGravityZone = true;
    mover.gravity = 0;
    const v = mover.velocity;
    // The mover's velocity is per step (metres moved this step); convert to m/s and back.
    // On the ground the mover holds a small downward push; start from rest instead.
    const speed = mover.grounded ? Math.max(0, v.y / dt) : v.y / dt;
    const target = targetSpeed(zone, pos.y);

    // A jump follows its own arc and would ignore the zone (falling back at
    // full speed in a slow-fall zone). Once it drops below the zone's speed,
    // end the jump and let the zone take over.
    const state = mover.saveState();
    if (state.jump.isJumping && speed < target) {
      mover.restoreState({ ...state, jump: { ...state.jump, isJumping: false, elapsedTime: 0, maxHeight: 0 } });
    }

    v.y = nextSpeed(speed, target, dt) * dt;
    mover.setVelocity(v);
    return true;
  }

  /**
   * Hovering holds idle. Letting the machine update there would switch to the
   * falling clip (the avatar is airborne) and back every step, which jitters.
   */
  private updateAnimation(dt: number, hovering: boolean): void {
    if (hovering) this.animStateMachine?.forceState("idle");
    else this.animStateMachine?.update(dt);
  }

  // Called every frame when game is running (via space.use)
  onUpdate = (dt: number) => {
    this.updateSettling();
    this.playersReplica?.update(dt);
    this.chatBubbles?.update(dt);
    this.broadcastLocalPlayerState(dt);
    this.syncInfoState(dt);
    this.music.update(this.musicZones(), this.listenerPosition(), dt);
  };

  /** Music zones (with a file) in the loaded chunks. */
  private musicZones(): MusicZoneDef[] {
    const out: MusicZoneDef[] = [];
    for (const c of this.space?.components.byType("music-zone") ?? []) {
      const zone = musicZoneFromComponent(c.data);
      if (zone) out.push(zone);
    }
    return out;
  }

  /** Where music is heard from: the avatar's head, or the free camera in cinematic mode. */
  private listenerPosition(): { x: number; y: number; z: number } | null {
    if (this.cinematicRig) return Camera.current.position;
    const pos = this.localPlayerAvatar?.position;
    return pos ? { x: pos.x, y: pos.y + LISTENER_HEIGHT, z: pos.z } : null;
  }

  /** Throttled push of player roster + current chunk to the info UI store. */
  private syncInfoState(dt: number): void {
    this.timeSinceInfoSync += dt * 1000;
    if (this.timeSinceInfoSync < INFO_SYNC_INTERVAL) return;
    this.timeSinceInfoSync = 0;

    if (this.room) {
      const localId = this.room.sessionId;
      const players: PlayerInfo[] = [];
      this.room.state.players.forEach((p, sessionId) => {
        players.push({
          sessionId,
          x: p.x,
          y: p.y,
          z: p.z,
          isLocal: sessionId === localId,
          name: p.name ?? "",
          avatar: p.avatar ?? "",
          roleId: p.roleId ?? "everyone",
          roleName: p.roleName ?? "",
          roleColor: p.roleColor ?? "",
          rolePosition: p.rolePosition ?? 0,
          inVoice: !!p.inVoice,
          voiceMuted: !!p.voiceMuted,
          broadcasting: !!p.broadcasting,
        });
      });
      setPlayers(players);
    }

    // Loading state is pushed by the chunk transition callbacks, not polled.
    const chunks = this.space?.chunks ?? null;
    setChunk(chunks?.currentKey ?? null, chunks?.currentInfo ?? null);

    // Chunks stream doors in and out; keep newly loaded ones in step.
    this.applyGateDoors();

    // ...and screens: pick up new ones, and find the one the player is at.
    this.screenSync?.update(this.localPlayerAvatar?.position ?? null);

    this.updateNearLift();
    this.updateNearSeat();
  }

  /** Seats in the loaded chunks. */
  private seats(): SeatDef[] {
    const out: SeatDef[] = [];
    for (const c of this.space?.components.byType("seat") ?? []) {
      const seat = seatFromComponent(c.data);
      if (seat) out.push(seat);
    }
    return out;
  }

  /** The seat the player could sit on right now. */
  private seatInReach(): SeatDef | null {
    const pos = this.localPlayerAvatar?.position;
    return pos ? seatNear(this.seats(), pos) : null;
  }

  /** Offer the closest seat; while sitting, keep showing the seat being sat on. */
  private updateNearSeat(): void {
    if (this.seatedFrom) return;
    const seat = this.controlsActive && !this.cinematicRig ? this.seatInReach() : null;
    setNearSeat(seat ? { id: seat.id, prompt: seat.prompt } : null);
  }

  /** E: sit on the seat in reach, or stand up. */
  toggleSit(): void {
    if (this.seatedFrom) this.standUp();
    else this.sit();
  }

  /**
   * Snap onto the seat facing its arrow and play "sitting". Physics is off
   * while seated; other players see the pose through the usual position and
   * animation updates.
   */
  sit(): boolean {
    const avatar = this.localPlayerAvatar as any;
    if (this.seatedFrom || !this.controlsActive || this.cinematicRig || !avatar?.rigidBody) return false;
    const seat = this.seatInReach();
    if (!seat) return false;

    this.setFlyingState(false);
    this.seatedFrom = avatar.position.clone();

    avatar.rigidBody.resetVelocities();
    avatar.rigidBody.enabled = false;
    avatar.position.set(seat.sitAt.x, seat.sitAt.y, seat.sitAt.z);
    avatar.rotation.y = seat.rotY;

    if (this.animStateMachine) this.animStateMachine.enabled = false;
    avatar.play("sitting", { fadeIn: 0, stopAll: true, persist: true });
    setSeated(true);
    this.settling = { seat, frames: SETTLE_FRAMES };
    return true;
  }

  /** Called every frame: once the sitting pose has been applied, settle onto the seat. */
  private updateSettling(): void {
    if (!this.settling) return;
    if (!this.seatedFrom) {
      this.settling = null;
      return;
    }
    if (--this.settling.frames > 0) return;
    const { seat } = this.settling;
    this.settling = null;
    this.settleOnSeat(seat);
  }

  /**
   * The sitting clip lifts the body well above the avatar's origin, by an
   * amount that depends on the avatar. Measure the pose and shift the avatar
   * so its hips are centred over the square and the underside of its
   * backside and thighs rests exactly on it.
   */
  private settleOnSeat(seat: SeatDef): void {
    const avatar = this.localPlayerAvatar as any;
    const model = avatarModel(avatar);
    const hips = findHips(model);
    if (!hips) return;
    // Measure against the model's own origin: it follows the avatar every frame.
    model.updateMatrixWorld(true);
    const hipsAt = hips.getWorldPosition(new Vector3());
    const origin = model.getWorldPosition(new Vector3());
    const lowest = lowestSeatedPoint(model) ?? hipsAt.y - HIPS_ABOVE_SEAT;
    avatar.position.set(
      seat.sitAt.x - (hipsAt.x - origin.x),
      seat.sitAt.y - (lowest - origin.y),
      seat.sitAt.z - (hipsAt.z - origin.z),
    );
  }

  /** Get up and step back to where the player stood before sitting. */
  standUp(): void {
    const from = this.seatedFrom;
    if (!from) return;
    this.seatedFrom = null;
    setSeated(false);

    const avatar = this.localPlayerAvatar as any;
    if (!avatar?.rigidBody) return;
    avatar.position.copy(from);
    avatar.rigidBody.enabled = true;
    avatar.rigidBody.teleport(from, avatar.quaternion);
    this.mover?.reset();

    // The state machine may still think it's in "idle" and not replay it.
    avatar.play("idle", { fadeIn: 0.2, stopAll: true, persist: true });
    if (this.animStateMachine) {
      this.animStateMachine.enabled = this.controlsActive;
      this.animStateMachine.forceState("idle");
    }
  }

  /** Lift boxes in the loaded chunks. */
  private lifts(): LiftDef[] {
    const out: LiftDef[] = [];
    for (const c of this.space?.components.byType("lift") ?? []) {
      const lift = liftFromComponent(c.data);
      if (lift) out.push(lift);
    }
    return out;
  }

  /** Which lift box the player stands in, and which of its floors they may go to. */
  private updateNearLift(): void {
    const pos = this.localPlayerAvatar?.position;
    const lifts = pos ? this.lifts() : [];
    const here = pos ? liftAt(lifts, pos) : null;
    if (!here) return setNearLift(null);

    const gates = (this.space?.components.byType("token-gate") ?? [])
      .map((c) => gateFromComponent(c.data))
      .filter((g) => g != null);

    setNearLift({
      id: here.id,
      group: here.group,
      floor: here.floor,
      label: here.label,
      floors: floorsOf(lifts, here.group).map((lift) => {
        // The current floor is always reachable: the player is standing on it.
        const gate =
          lift.id === here.id
            ? undefined
            : gates.find((g) => this.gateAccess[g.id] !== true && pointInGate(g, lift.arrival));
        const chunkLocked = lift.id !== here.id && this.chunkAccess[posToChunkKey(lift.arrival)] === false;
        return {
          id: lift.id,
          floor: lift.floor,
          label: lift.label,
          locked: !!gate || chunkLocked,
          lockReason: gate ? describeRequirement(gate.requirement) : chunkLocked ? "Members only" : "",
        };
      }),
    });
  }

  /** Take the lift to another floor: arrive at the bottom centre of its box. */
  async rideLift(liftId: string): Promise<boolean> {
    const lift = this.lifts().find((l) => l.id === liftId);
    if (!lift) return false;
    return this.travelTo(lift.arrival);
  }

  /**
   * Doors of gates the player may enter are passable and hidden; every other
   * door stays solid. Purely local — each client simulates only its own
   * player, and the server rejects positions inside a gate regardless.
   */
  private applyGateDoors(): void {
    const components = this.space?.components;
    if (!components) return;

    for (const gate of components.byType("token-gate")) {
      const doorTag = String((gate.data as any).doorTag ?? "").trim();
      if (!doorTag) continue;

      const open = this.gateAccess[gate.data.id] === true;
      for (const door of components.byTag(doorTag) as any[]) {
        if (door.rigidBody && door.rigidBody.enabled === open) {
          door.rigidBody.enabled = !open;
        }
        if (door.visible === open) door.visible = !open;
      }
    }
  }

  /** Send the local player out of a gate they may not enter. */
  private leaveGate(
    exit: { x: number; y: number; z: number },
    label: string,
    requirement: string,
    source: "local" | "server",
  ): Promise<void> {
    return this.leaveRestricted(exit, label, requirement, "gate", source);
  }

  /** Show why, and go back to `exit` (if known) — gates and members-only chunks alike. */
  private async leaveRestricted(
    exit: { x: number; y: number; z: number } | null,
    label: string,
    requirement: string,
    kind: "gate" | "chunk",
    source: "local" | "server",
  ): Promise<void> {
    // Already on the way out: the local sensor and the server both report
    // the same intrusion.
    if (this.leavingRestricted) return;
    if (source === "server" && performance.now() - this.leftRestrictedAt < GATE_DENIAL_GRACE) return;

    this.leavingRestricted = true;
    try {
      showGateNotice(label, requirement, kind);
      if (exit) await this.travelTo(exit);
    } finally {
      this.leavingRestricted = false;
      this.leftRestrictedAt = performance.now();
    }
  }

  /** Moderation: the server checks permission and rank and replies with `mod:result`. */
  kickPlayer(sessionId: string): void {
    this.room?.send(MOD_KICK_MESSAGE, { sessionId });
  }

  banPlayer(sessionId: string): void {
    this.room?.send(MOD_BAN_MESSAGE, { sessionId });
  }

  /** Voice chat. `joinVoice` must run from a click (microphone and audio need a user gesture). */
  joinVoice(): Promise<void> {
    return this.voice?.join() ?? Promise.resolve();
  }

  leaveVoice(): void {
    this.voice?.leave();
  }

  /** Go live to everyone in the chunk, or stop. The server checks Broadcast Voice. */
  setBroadcast(on: boolean): void {
    this.room?.send(VOICE_BROADCAST_MESSAGE, { on });
  }

  /** Moderation: silence a lower-ranked player in voice for everyone. The server checks. */
  mutePlayer(sessionId: string, muted: boolean): void {
    this.room?.send(MOD_MUTE_MESSAGE, { sessionId, muted });
  }

  /** Text chat: say something in `world` or the current room. The server checks Send Messages. */
  sendChat(channel: string, text: string): void {
    this.room?.send(CHAT_SEND_MESSAGE, { channel, text });
  }

  /** Video screens: the server checks Control Screens and shares the result with everyone. */
  controlScreen(screenId: string, action: ScreenAction): void {
    this.screenSync?.control(screenId, action);
  }

  screenTime(screenId: string): { time: number; duration: number } {
    return this.screenSync?.timeOf(screenId) ?? { time: 0, duration: 0 };
  }

  /**
   * Sign-in changed (log in, log out, Keplr linked): send the server a fresh
   * token so it re-decides gate access.
   */
  async refreshAuth(): Promise<void> {
    if (!this.room) return;
    this.room.send(AUTH_UPDATE_MESSAGE, { accessToken: await getAccessToken() });
  }

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

  getSpace(): Space | null {
    return this.space;
  }

  /**
   * Move the local player to a world position. When the chunk system is
   * enabled the destination chunk is streamed in via {@link ChunkManager};
   * otherwise (full scene loaded) we teleport the avatar directly.
   *
   * Returns false if the trip was abandoned because the destination chunk
   * could not be loaded — the player is left where they were.
   */
  async travelTo(pos: { x: number; y: number; z: number }): Promise<boolean> {
    const avatar = this.localPlayerAvatar as any;
    if (!avatar?.rigidBody) return false;

    // Don't stream in a members-only chunk the server will refuse anyway.
    const key = posToChunkKey(pos);
    if (this.chunkAccess[key] === false) {
      showGateNotice("That destination", "", "chunk");
      return false;
    }

    // Land on the destination floor rather than hovering above it.
    this.standUp();
    this.setFlyingState(false);

    const target = new Vector3(pos.x, pos.y, pos.z);
    const chunks = this.space?.chunks;

    if (chunks) {
      return chunks.travelTo(target, avatar);
    }

    // No chunking: direct teleport (assets already present).
    avatar.rigidBody.resetVelocities();
    avatar.rigidBody.enabled = false;
    avatar.position.copy(target);
    avatar.rigidBody.enabled = true;
    avatar.rigidBody.teleport(target, avatar.quaternion);
    return true;
  }

  /**
   * `?plot=<key | slug>` links start the player at that plot's first portal.
   * Returns false (normal spawn) when the link matches no plot with a portal,
   * or the plot can't be entered.
   */
  private async enterLinkedPlot(): Promise<boolean> {
    const plot = readPlotParam();
    if (!plot) return false;
    const entry = await findPlotEntry(plot);
    if (!entry) return false;
    return this.travelTo(entry.position);
  }

  /** Teleport the local player to another player's current position. */
  async teleportToPlayer(sessionId: string): Promise<void> {
    const remote = this.room?.state.players.get(sessionId);
    if (!remote) return;
    await this.travelTo({ x: remote.x, y: remote.y, z: remote.z });
  }
}
