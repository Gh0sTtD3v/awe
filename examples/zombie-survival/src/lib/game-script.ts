import {
  Camera,
  type Component3D,
  type Space,
  ModelComponent,
  AvatarComponent,
  NavmeshComponent,
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Custom,
  Interactions,
} from "@oncyberio/engine";
import {
  Mover,
  FirstPersonCameraRig,
} from "@oncyberio/engine/controls";
import {
  Vector3,
  MeshBasicMaterial,
  SphereGeometry,
  Mesh,
  PointLight,
} from "three";
import { createGame } from "@/lib/utils";
import { ZombieManager } from "@/lib/zombie-manager";
import { GAME_CONFIG } from "@/lib/game-config";
import {
  loadSound,
  playSound,
  stopSound,
  disposeAllSounds,
  playRandomSound,
} from "@/lib/audio-manager";
import {
  gameStore,
  setGamePhase,
  decrementAmmo,
  setAmmo,
  setIsReloading,
  setMatchTimeRemaining,
  resetGame,
} from "@/lib/game-store";

// --- FPS Input definitions ---
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
    bindings: [Mouse.pointerLockDelta(), Gamepad.rightStick()],
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
  Fire: {
    type: "button" as const,
    bindings: [
      Mouse.button(0),
      Gamepad.button("RT"),
      Custom.button("fire"),
    ],
    interactions: [Interactions.press()],
  },
  Reload: {
    type: "button" as const,
    bindings: [
      Keyboard.button("KeyR"),
      Gamepad.button("X"),
      Custom.button("reload"),
    ],
    interactions: [Interactions.press()],
  },
  Inspect: {
    type: "button" as const,
    bindings: [
      Keyboard.button("KeyI"),
      Gamepad.button("Y"),
      Custom.button("inspect"),
    ],
    interactions: [Interactions.press()],
  },
} as const;

// Module-level reference for external control
let scriptInstance: GameScript | null = null;

export function startGame() {
  scriptInstance?.start();
}

export function togglePause() {
  scriptInstance?.togglePause();
}

export function reload() {
  scriptInstance?.reload();
}

export class GameScript {
  private space: Space | null = null;
  // Control primitives
  private inputs: ReturnType<typeof createInputs<typeof GAMEPLAY_INPUTS>> | null = null;
  private cameraRig: FirstPersonCameraRig | null = null;
  private mover: Mover | null = null;
  private controlsActive = false;
  private cleanup: (() => void) | null = null;
  private pistol: ModelComponent | null = null;
  private readonly weaponId = "fps-weapon";
  private isReloading = false;
  private isShooting = false;
  private isInspecting = false;
  private isDrawingWeapon = false;
  private lastShotTime = 0;
  private readonly fireRateMs = GAME_CONFIG.fireRate * 1000;
  private readonly inspectAnimationMs = 1100;
  private readonly drawAnimationMs = 450;
  private zombieManager: ZombieManager | null = null;
  private navmesh: NavmeshComponent | null = null;
  private navmeshReady = false;

  private _player: AvatarComponent | null = null;
  private isSprinting = false;

  // Recoil state
  private recoilOffset = 0;
  private recoilRecoverySpeed = 8;
  private recoilAmount = 0.03;

  // Muzzle flash
  private muzzleFlash: Mesh | null = null;
  private muzzleLight: PointLight | null = null;

  // Track exploded barrels to prevent double-trigger
  private explodedBarrels = new Set<string>();
  private explodedContainers = new Set<string>();
  private containerHitCounts = new Map<string, number>();
  private readonly containerHitsToExplode = 5;
  private readonly containerExplosionRadius = GAME_CONFIG.explosionRadius * 1.5;
  private readonly containerExplosionDamage = GAME_CONFIG.explosionDamage * 1.5;
  private readonly explosionSounds = [
    "/assets/sounds/explosion/explosion1.mp3",
    "/assets/sounds/explosion/explosion2.mp3",
    "/assets/sounds/explosion/explosion3.mp3",
    "/assets/sounds/explosion/explosion4.mp3",
  ];

  // Timed zombie spawning
  private totalSpawned = 0;
  private spawnTimer = 0;

  async init() {
    scriptInstance = this;

    // Load sounds
    loadSound("walking", "/assets/sounds/player/walking.mp3", true, 0.5);
    loadSound("running", "/assets/sounds/player/running.mp3", true, 0.5);
    loadSound("gunshot", "/assets/sounds/gun/gun-shot.mp3", false, 0.6);
    loadSound("reload", "/assets/sounds/gun/gun-relead.mp3", false, 0.6);

    const { space, reveal } = await createGame({ baseUrl: "" });
    this.space = space;

    this._player = this.space.components.byId("player") as AvatarComponent;

    if (!this._player) {
      console.warn("[Shooter] Player avatar not found");
      return;
    }

    // Input system
    this.inputs = createInputs(GAMEPLAY_INPUTS);

    // First-person camera rig
    this.cameraRig = new FirstPersonCameraRig({
      camera: Camera.current,
      target: this._player,
      height: 1.6,
      sensitivity: { x: 1, y: 1 },
      invertY: false,
    });

    // Mover
    this.mover = new Mover({
      body: this._player,
      target: Camera.current,
      movement: {
        speed: GAME_CONFIG.playerWalkSpeed,
        gravity: -30,
        acceleration: 200,
        airControl: 1,
        facingMode: "none",
      },
      jump: {
        height: GAME_CONFIG.playerJumpForce,
        maxJumps: 1,
      },
    });

    // Wire jump input
    this.inputs.Jump.onPerformed(() => {
      this.mover?.startJump();
    });
    this.inputs.Fire.onPerformed(this.shoot);
    this.inputs.Reload.onPerformed(() => {
      this.reload();
    });
    this.inputs.Inspect.onPerformed(() => {
      this.inspect();
    });

    // Hide avatar for FPS view
    this._player.visible = false;

    this.mover.on("movementStart", this.onMovementStart);
    this.mover.on("movementStop", this.onMovementStop);

    // @ts-ignore
    Camera.current.near = 0.01;

    this.setActive(false);

    await reveal();

    await this.setupWeapon();
    this.setupMuzzleFlash();

    resetGame();

    // Initialize navmesh and zombie manager
    this.navmesh = this.space.components.byId("navmesh") as NavmeshComponent;
    if (!this.navmesh) {
      console.warn("[Shooter] Navmesh component not found");
      return;
    }
    this.navmesh.subscribe(() => {
      this.navmeshReady = true;
    });
    this.zombieManager = new ZombieManager(
      this.space,
      this._player,
      this.navmesh,
    );

    this.cleanup = this.space.use({
      onFixedUpdate: this.onFixedUpdate,
      onUpdate: this.onUpdate,
      onDispose: this.onDispose,
    });
  }

  dispose() {
    this.cleanup?.();
    this.cleanup = null;

    if (this.mover) {
      this.mover.off("movementStart", this.onMovementStart);
      this.mover.off("movementStop", this.onMovementStop);
    }

    // Restore avatar visibility
    if (this._player) this._player.visible = true;

    this.mover?.dispose();
    this.mover = null;
    this.cameraRig?.dispose();
    this.cameraRig = null;
    this.inputs?.dispose();
    this.inputs = null;

    if (this.muzzleFlash) {
      this.muzzleFlash.geometry.dispose();
      (this.muzzleFlash.material as MeshBasicMaterial).dispose();
      this.muzzleFlash = null;
    }
    this.muzzleLight = null;

    if (this.pistol) {
      Camera.current.remove(this.pistol);
      this.pistol = null;
    }

    this.zombieManager?.dispose();
    this.zombieManager = null;
    this.explodedBarrels.clear();
    this.explodedContainers.clear();
    this.containerHitCounts.clear();

    disposeAllSounds();

    this.space?.destroy();
    this.space = null;
    scriptInstance = null;
  }

  private setActive(val: boolean) {
    this.controlsActive = val;
    if (val) {
      this.inputs?.enable();
      this.mover?.reset();
    } else {
      this.inputs?.disable();
      this.isSprinting = false;
      stopSound("walking");
      stopSound("running");
    }
    if (this.cameraRig) this.cameraRig.active = val;
  }

  onFixedUpdate = (dt: number) => {
    if (!this.controlsActive || !this.inputs || !this.mover || !this.cameraRig) return;

    this.inputs.update(dt);

    const moveDir = this.inputs.Move.readValue();
    const lookDelta = this.inputs.Look.readValue();
    const isSprinting = this.inputs.Sprint.isPressed;
    this.syncSprintState(isSprinting);

    if (lookDelta.x !== 0 || lookDelta.y !== 0) {
      this.cameraRig.rotate(lookDelta.x, lookDelta.y);
    }

    const speed = isSprinting
      ? GAME_CONFIG.playerSprintSpeed
      : GAME_CONFIG.playerWalkSpeed;
    this.mover.move(moveDir.x, moveDir.y, {
      forward: this.cameraRig.forward,
      right: this.cameraRig.right,
      speed,
    });

    this.mover.update(dt);
  };

  private async setupWeapon() {
    if (!this.space) return;

    const pistolByIdentifier = this.space.components.byId(this.weaponId);
    let resolvedPistol = pistolByIdentifier ?? null;

    if (!(resolvedPistol instanceof ModelComponent)) {
      try {
        resolvedPistol = await this.space.components.create({
          type: "model",
          id: this.weaponId,
          name: "FPS MP5",
          url: GAME_CONFIG.weaponView.assetUrl,
          enableAnimation: true,
          animations: {},
          center: true,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        });
      } catch (error) {
        console.warn("[Shooter] Failed to create FPS weapon model:", error);
      }
    }

    this.pistol =
      resolvedPistol instanceof ModelComponent ? resolvedPistol : null;
    if (!this.pistol) {
      console.warn("[Shooter] FPS weapon model not found");
      return;
    }

    this.attachWeaponToCamera();

    // Keep first-person meshes rendered even when very close to the camera.
    this.pistol.traverse((child: any) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.frustumCulled = false;
      }
    });

    // Start in idle so weapon never appears in bind pose.
    this.pistol.play(GAME_CONFIG.weaponAnimations.idle, {
      loop: "repeat",
      stopAll: true,
    });
  }

  private attachWeaponToCamera() {
    if (!this.pistol) return;

    if (this.pistol.parent !== Camera.current) {
      Camera.current.add(this.pistol);
    }

    this.pistol.visible = true;
    this.pistol.position.set(
      GAME_CONFIG.weaponView.position.x,
      GAME_CONFIG.weaponView.position.y,
      GAME_CONFIG.weaponView.position.z,
    );
    this.pistol.rotation.set(
      GAME_CONFIG.weaponView.rotation.x,
      GAME_CONFIG.weaponView.rotation.y,
      GAME_CONFIG.weaponView.rotation.z,
    );
    this.pistol.scale.setScalar(GAME_CONFIG.weaponView.scale);
    this.pistol.updateMatrixWorld(true);
  }

  private setupMuzzleFlash() {
    // Small bright sphere for muzzle flash
    const geo = new SphereGeometry(0.02, 8, 8);
    const mat = new MeshBasicMaterial({ color: 0xffcc00 });
    this.muzzleFlash = new Mesh(geo, mat);
    this.muzzleFlash.visible = false;
    // Position at barrel tip relative to weapon root.
    this.muzzleFlash.position.set(
      GAME_CONFIG.weaponView.muzzleFlashPosition.x,
      GAME_CONFIG.weaponView.muzzleFlashPosition.y,
      GAME_CONFIG.weaponView.muzzleFlashPosition.z,
    );

    // Muzzle point light
    this.muzzleLight = new PointLight(0xffaa00, 0, 3);
    this.muzzleLight.position.copy(this.muzzleFlash.position);

    if (this.pistol) {
      this.pistol.add(this.muzzleFlash);
      this.pistol.add(this.muzzleLight);
    }
  }

  private showMuzzleFlash() {
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = true;
      // Random size for variation
      const s = 0.8 + Math.random() * 0.4;
      this.muzzleFlash.scale.setScalar(s);
    }
    if (this.muzzleLight) {
      this.muzzleLight.intensity = 2;
    }

    setTimeout(() => {
      if (this.muzzleFlash) this.muzzleFlash.visible = false;
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }, 50);
  }

  private spawnImpactVFX(
    point: { x: number; y: number; z: number },
    isBlood: boolean,
  ) {
    if (!this.space) return;

    const color = isBlood ? 0xcc0000 : 0x999966;
    const count = isBlood ? 6 : 4;

    for (let i = 0; i < count; i++) {
      const geo = new SphereGeometry(0.05 + Math.random() * 0.05, 4, 4);
      const mat = new MeshBasicMaterial({ color });
      const particle = new Mesh(geo, mat);
      particle.position.set(
        point.x + (Math.random() - 0.5) * 0.3,
        point.y + (Math.random() - 0.5) * 0.3,
        point.z + (Math.random() - 0.5) * 0.3,
      );
      // @ts-ignore - add to scene root
      this.space.add(particle);

      // Animate and remove
      const vel = new Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2,
      );
      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.4) {
          // @ts-ignore
          this.space?.remove(particle);
          geo.dispose();
          mat.dispose();
          return;
        }
        particle.position.add(vel.clone().multiplyScalar(0.016));
        vel.y -= 9.8 * 0.016;
        mat.opacity = 1 - elapsed / 0.4;
        mat.transparent = true;
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  private applyRecoil() {
    this.recoilOffset = this.recoilAmount;
  }

  private getMovementWeaponAnimation() {
    if (this.isSprinting) {
      return (
        GAME_CONFIG.weaponAnimations.sprint ||
        GAME_CONFIG.weaponAnimations.run ||
        GAME_CONFIG.weaponAnimations.walk
      );
    }
    return GAME_CONFIG.weaponAnimations.walk;
  }

  start() {
    if (!this.space) return;

    this.setActive(true);

    this.isDrawingWeapon = true;
    this.pistol?.play(GAME_CONFIG.weaponAnimations.draw, {
      loop: "once",
      clampWhenFinished: false,
      stopAll: true,
    });
    setTimeout(() => {
      this.isDrawingWeapon = false;
      this.syncWeaponAnimation();
    }, this.drawAnimationMs);

    setGamePhase("playing");
    this.space.start();

    // Reset spawning state and spawn initial batch
    this.totalSpawned = 0;
    this.spawnTimer = 0;
    this.explodedBarrels.clear();
    this.explodedContainers.clear();
    this.containerHitCounts.clear();
    this.spawnBatch(GAME_CONFIG.initialZombies);
  }

  private async spawnBatch(count: number) {
    if (!this.zombieManager || !this.navmeshReady) return;

    const remaining = GAME_CONFIG.maxZombies - this.totalSpawned;
    const toSpawn = Math.min(count, remaining);
    if (toSpawn <= 0) return;

    const mapHalfSize = 40;
    const minDist = GAME_CONFIG.spawnMinDistanceFromPlayer;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < toSpawn; i++) {
      const pos = this.getZombieSpawnPosition(mapHalfSize, minDist);
      promises.push(this.zombieManager.spawnZombie(pos));
    }

    await Promise.all(promises);
    this.totalSpawned += toSpawn;
  }

  private getZombieSpawnPosition(mapHalfSize: number, minDist: number) {
    const playerPos = this._player?.position;
    const playerX = playerPos?.x ?? 0;
    const playerY = playerPos?.y ?? 0;
    const playerZ = playerPos?.z ?? 0;

    for (let attempt = 0; attempt < 10; attempt++) {
      const navPoint = this.navmesh?.crowd?.findRandomPoint();
      if (
        navPoint &&
        this.isSpawnPositionFarEnough(navPoint.x, navPoint.z, playerX, playerZ, minDist)
      ) {
        return { x: navPoint.x, y: navPoint.y, z: navPoint.z };
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (mapHalfSize - minDist);
    const fallbackTarget = new Vector3(
      playerX + Math.cos(angle) * dist,
      playerY,
      playerZ + Math.sin(angle) * dist
    );
    const snappedPoint = this.navmesh?.crowd?.findClosestPoint(fallbackTarget);

    if (
      snappedPoint &&
      this.isSpawnPositionFarEnough(
        snappedPoint.x,
        snappedPoint.z,
        playerX,
        playerZ,
        minDist
      )
    ) {
      return { x: snappedPoint.x, y: snappedPoint.y, z: snappedPoint.z };
    }

    return {
      x: fallbackTarget.x,
      y: fallbackTarget.y,
      z: fallbackTarget.z,
    };
  }

  private isSpawnPositionFarEnough(
    spawnX: number,
    spawnZ: number,
    playerX: number,
    playerZ: number,
    minDist: number
  ) {
    const dx = spawnX - playerX;
    const dz = spawnZ - playerZ;
    return Math.hypot(dx, dz) >= minDist;
  }

  private endGame(result: "won" | "lost") {
    setGamePhase(result);
    this.setActive(false);
    disposeAllSounds();
    document.exitPointerLock();
  }

  togglePause() {
    if (!this.space) return;

    const state = gameStore.state;
    if (state.gamePhase !== "playing") return;

    this.setActive(!this.controlsActive);

    if (this.controlsActive) {
      this.space.start();
    } else {
      this.space.stop();
    }
  }

  onUpdate = (dt: number) => {
    const state = gameStore.state;
    if (state.gamePhase !== "playing") return;

    this.attachWeaponToCamera();

    // Recover recoil smoothly
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(
        0,
        this.recoilOffset - this.recoilRecoverySpeed * dt,
      );
      const cam = Camera.current;
      cam.rotation.x += this.recoilOffset * 0.1;
    }

    // Match timer countdown
    const newTime = Math.max(0, state.matchTimeRemaining - dt);
    setMatchTimeRemaining(newTime);

    if (newTime <= 0) {
      // Time's up — check win/lose
      if (state.zombieAliveCount === 0) {
        this.endGame("won");
      } else {
        this.endGame("lost");
      }
      return;
    }

    // Timed zombie spawning
    if (this.totalSpawned < GAME_CONFIG.maxZombies) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= GAME_CONFIG.spawnInterval) {
        this.spawnTimer -= GAME_CONFIG.spawnInterval;
        this.spawnBatch(GAME_CONFIG.spawnBatchSize);
      }
    }

    // All zombies spawned and killed — mission passed
    if (
      this.totalSpawned >= GAME_CONFIG.maxZombies &&
      state.zombieAliveCount === 0
    ) {
      this.endGame("won");
      return;
    }

    // Update zombie AI
    this.zombieManager?.update(dt);

    // Check if player died during zombie attacks
    if (gameStore.state.playerHealth <= 0) {
      this.endGame("lost");
      return;
    }
  };

  onDispose = () => {
    console.log("[Shooter] Game disposed");
  };

  onMovementStart = () => {
    this.syncWeaponAnimation();
    this.updateMovementSound();
  };

  onMovementStop = () => {
    this.syncWeaponAnimation();
    stopSound("walking");
    stopSound("running");
  };

  private updateMovementSound() {
    if (!this.mover?.isMoving) return;
    if (this.isSprinting) {
      stopSound("walking");
      playSound("running");
    } else {
      stopSound("running");
      playSound("walking");
    }
  }

  private syncSprintState(nextSprinting: boolean) {
    if (this.isSprinting === nextSprinting) return;

    this.isSprinting = nextSprinting;
    if (this.mover?.isMoving) {
      this.updateMovementSound();
      this.syncWeaponAnimation();
    }
  }

  private syncWeaponAnimation() {
    if (!this.mover || !this.pistol) return;
    if (
      this.isShooting ||
      this.isReloading ||
      this.isInspecting ||
      this.isDrawingWeapon
    )
      return;
    if (this.mover.isMoving) {
      this.pistol.play(this.getMovementWeaponAnimation(), {
        loop: "repeat",
        stopAll: true,
      });
    } else {
      this.pistol.play(GAME_CONFIG.weaponAnimations.idle, {
        loop: "repeat",
        stopAll: true,
      });
    }
  }

  inspect() {
    const state = gameStore.state;
    if (
      !this.controlsActive ||
      state.gamePhase !== "playing" ||
      this.isReloading ||
      this.isShooting ||
      this.isInspecting
    )
      return;

    this.isInspecting = true;
    this.pistol?.play(GAME_CONFIG.weaponAnimations.inspect, {
      loop: "once",
      clampWhenFinished: false,
      stopAll: true,
    });
    setTimeout(() => {
      this.isInspecting = false;
      this.syncWeaponAnimation();
    }, this.inspectAnimationMs);
  }

  private shoot = () => {
    const state = gameStore.state;
    if (
      !this.controlsActive ||
      state.gamePhase !== "playing" ||
      state.isReloading
    )
      return;
    if (state.ammo <= 0) return;

    const now = performance.now();
    if (now - this.lastShotTime < this.fireRateMs) return;
    this.lastShotTime = now;

    decrementAmmo();
    playSound("gunshot");

    // VFX
    this.showMuzzleFlash();
    this.applyRecoil();

    this.isShooting = true;
    this.pistol?.play(GAME_CONFIG.weaponAnimations.fire, {
      loop: "once",
      clampWhenFinished: false,
      timeScale: 4,
      stopAll: true,
    });
    setTimeout(() => {
      this.isShooting = false;
      this.syncWeaponAnimation();
    }, 250);

    const cam = Camera.current;
    const direction = new Vector3(0, 0, -1);
    direction.applyQuaternion(cam.quaternion);

    const origin = cam.position.clone();

    if (!this.space) return;
    const physics = this.space.physics;
    if (!physics) return;

    const playerAvatar = this._player;

    const hit = physics.physicsRaycast({
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
      maxDistance: 100,
      ignoreRigidbody: playerAvatar?.rigidBody,
    });

    if (hit) {
      if (hit.component?.tag === "enemy") {
        // Damage zombie via manager
        this.zombieManager?.damageZombie(
          hit.component.componentId,
          GAME_CONFIG.gunDamage,
        );
        // Blood impact VFX
        this.spawnImpactVFX(hit.point, true);
      } else if (hit.component?.tag === "barrel") {
        this.spawnImpactVFX(hit.point, false);
        this.triggerBarrelExplosion(hit.component);
      } else if (hit.component?.tag === "explosive-container") {
        this.spawnImpactVFX(hit.point, false);
        this.registerContainerHit(hit.component);
      } else {
        // Dust impact VFX for obstacles/floor
        this.spawnImpactVFX(hit.point, false);
      }
    }
  };

  private registerContainerHit(container: Component3D) {
    const containerId = container.componentId;
    if (this.explodedContainers.has(containerId)) return;

    const newHitCount = (this.containerHitCounts.get(containerId) ?? 0) + 1;
    this.containerHitCounts.set(containerId, newHitCount);
    if (newHitCount >= this.containerHitsToExplode) {
      this.triggerContainerExplosion(container);
    }
  }

  private triggerBarrelExplosion(barrel: Component3D) {
    const barrelId = barrel.componentId;
    if (this.explodedBarrels.has(barrelId)) return;
    this.explodedBarrels.add(barrelId);

    const pos = {
      x: barrel.position.x,
      y: barrel.position.y,
      z: barrel.position.z,
    };

    // Short delay before explosion
    setTimeout(() => {
      playRandomSound(this.explosionSounds, 0.7);

      // Explosion VFX
      this.spawnExplosionVFX(pos);

      // AoE damage to all zombies in radius
      this.zombieManager?.damageZombiesInRadius(
        pos,
        GAME_CONFIG.explosionRadius,
        GAME_CONFIG.explosionDamage,
      );

      // Destroy the barrel
      try {
        barrel.destroy();
      } catch (_) {}
    }, 300);
  }

  private triggerContainerExplosion(container: Component3D) {
    const containerId = container.componentId;
    if (this.explodedContainers.has(containerId)) return;
    this.explodedContainers.add(containerId);
    this.containerHitCounts.delete(containerId);

    const pos = {
      x: container.position.x,
      y: container.position.y,
      z: container.position.z,
    };

    // Slightly delayed to make the final hit feel heavier than barrel pops.
    setTimeout(() => {
      playRandomSound(this.explosionSounds, 0.9);

      this.spawnExplosionVFX(pos, {
        flashRadius: 2.2,
        flashGrow: 3.2,
        lightIntensity: 12,
        lightDistance: 28,
        durationSec: 0.9,
        particleCount: 22,
        particleSpread: 0.8,
        particleVelocity: 8,
        particleLifetimeSec: 1.1,
      });

      this.zombieManager?.damageZombiesInRadius(
        pos,
        this.containerExplosionRadius,
        this.containerExplosionDamage,
      );

      try {
        container.destroy();
      } catch (_) {}
    }, 350);
  }

  private spawnExplosionVFX(
    point: { x: number; y: number; z: number },
    options: {
      flashRadius?: number;
      flashGrow?: number;
      lightIntensity?: number;
      lightDistance?: number;
      durationSec?: number;
      particleCount?: number;
      particleSpread?: number;
      particleVelocity?: number;
      particleLifetimeSec?: number;
    } = {},
  ) {
    if (!this.space) return;
    const {
      flashRadius = 1.5,
      flashGrow = 2,
      lightIntensity = 8,
      lightDistance = 20,
      durationSec = 0.6,
      particleCount = 12,
      particleSpread = 0.5,
      particleVelocity = 6,
      particleLifetimeSec = 0.8,
    } = options;

    // Large central flash
    const flashGeo = new SphereGeometry(flashRadius, 12, 12);
    const flashMat = new MeshBasicMaterial({ color: 0xff6600 });
    const flash = new Mesh(flashGeo, flashMat);
    flash.position.set(point.x, point.y + 1, point.z);
    // @ts-ignore
    this.space.add(flash);

    // Explosion light
    const explosionLight = new PointLight(
      0xff4400,
      lightIntensity,
      lightDistance,
    );
    explosionLight.position.set(point.x, point.y + 2, point.z);
    // @ts-ignore
    this.space.add(explosionLight);

    // Fade out flash and light
    const startTime = performance.now();
    const animateFlash = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > durationSec) {
        // @ts-ignore
        this.space?.remove(flash);
        // @ts-ignore
        this.space?.remove(explosionLight);
        flashGeo.dispose();
        flashMat.dispose();
        return;
      }
      const t = elapsed / durationSec;
      flash.scale.setScalar(1 + t * flashGrow);
      flashMat.opacity = 1 - t;
      flashMat.transparent = true;
      explosionLight.intensity = lightIntensity * (1 - t);
      requestAnimationFrame(animateFlash);
    };
    requestAnimationFrame(animateFlash);

    // Scattered debris particles
    for (let i = 0; i < particleCount; i++) {
      const size = flashRadius * (0.06 + Math.random() * 0.09);
      const geo = new SphereGeometry(size, 4, 4);
      const color = Math.random() > 0.5 ? 0xff4400 : 0x333333;
      const mat = new MeshBasicMaterial({ color });
      const particle = new Mesh(geo, mat);
      particle.position.set(
        point.x + (Math.random() - 0.5) * particleSpread,
        point.y + 0.5 + Math.random() * 0.5,
        point.z + (Math.random() - 0.5) * particleSpread,
      );
      // @ts-ignore
      this.space.add(particle);

      const vel = new Vector3(
        (Math.random() - 0.5) * particleVelocity,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * particleVelocity,
      );
      const pStart = performance.now();
      const animateP = () => {
        const el = (performance.now() - pStart) / 1000;
        if (el > particleLifetimeSec) {
          // @ts-ignore
          this.space?.remove(particle);
          geo.dispose();
          mat.dispose();
          return;
        }
        particle.position.add(vel.clone().multiplyScalar(0.016));
        vel.y -= 9.8 * 0.016;
        mat.opacity = 1 - el / particleLifetimeSec;
        mat.transparent = true;
        requestAnimationFrame(animateP);
      };
      requestAnimationFrame(animateP);
    }
  }

  reload() {
    const state = gameStore.state;
    if (!this.controlsActive || state.gamePhase !== "playing" || this.isReloading)
      return;
    if (state.ammo === state.maxAmmo) return;

    const clip =
      state.ammo === 0
        ? GAME_CONFIG.weaponAnimations.reloadFull
        : GAME_CONFIG.weaponAnimations.reloadPartial;

    this.isReloading = true;
    setIsReloading(true);
    playSound("reload");

    this.pistol?.play(clip, {
      loop: "once",
      clampWhenFinished: true,
      timeScale: 1,
      stopAll: true,
    });

    setTimeout(() => {
      setAmmo(GAME_CONFIG.ammoCapacity);
      this.isReloading = false;
      setIsReloading(false);
      this.syncWeaponAnimation();
    }, GAME_CONFIG.reloadTime * 1000);
  }

  getZombieManager(): ZombieManager | null {
    return this.zombieManager;
  }
}
