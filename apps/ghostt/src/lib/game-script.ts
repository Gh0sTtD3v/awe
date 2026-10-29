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
  ThirdPersonCameraRig,
  createMoverAnimStateMachine,
} from "@oncyberio/engine/controls";
import type { MoverAnimLocomotionState } from "@oncyberio/engine/controls";
import { Vector3 } from "three";
import { createGame } from "@/lib/utils";
import { gameStore, setStarted, setPaused } from "@/lib/game-store";
import { loadPortals } from "@/lib/portals";
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
  Sprint: {
    type: "button" as const,
    bindings: [
      Keyboard.button("ShiftLeft"),
      Keyboard.button("ShiftRight"),
      Gamepad.button("LB"),
    ],
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
const SPRINT_BOOST = 1.5;

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
  private mover: Mover | null = null;
  private animStateMachine: ReturnType<typeof createMoverAnimStateMachine> | null = null;
  private controlsActive = false;

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
          gravity: -1.81,
          acceleration: 100,
          deceleration: 50,
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
        locomotionThresholds: { walk: 10, sprint: SPEED * SPRINT_BOOST },
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
        this.mover?.startJump();
      });

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
      if (chunks) {
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
    this.cameraRig?.dispose();
    this.cameraRig = null;
    this.inputs?.dispose();
    this.inputs = null;

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
      this.inputs?.disable();
      this.animStateMachine?.forceState("idle");
    }
    if (this.cameraRig) this.cameraRig.active = val;
    if (this.animStateMachine) this.animStateMachine.enabled = val;
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
    const isSprinting = this.inputs.Sprint.isPressed;
    const speed = isSprinting ? SPEED * SPRINT_BOOST : SPEED;

    const lookDelta = this.inputs.Look.readValue();
    const zoomDelta = this.inputs.Zoom.readValue();

    this.cameraRig?.rotate(lookDelta.x, lookDelta.y);
    this.cameraRig?.zoom(zoomDelta * 0.1);
    this.mover.move(moveDir.x, moveDir.y, speed);

    if (this.inputs.Jump.wasJustPressed) {
      this.mover.startJump();
    }

    this.mover.update(dt);
    this.animStateMachine?.update(dt);
  };

  // Called every frame when game is running (via space.use)
  onUpdate = (dt: number) => {
    this.playersReplica?.update(dt);
    this.chatBubbles?.update(dt);
    this.broadcastLocalPlayerState(dt);
    this.syncInfoState(dt);
  };

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

  /** Teleport the local player to another player's current position. */
  async teleportToPlayer(sessionId: string): Promise<void> {
    const remote = this.room?.state.players.get(sessionId);
    if (!remote) return;
    await this.travelTo({ x: remote.x, y: remote.y, z: remote.z });
  }
}
