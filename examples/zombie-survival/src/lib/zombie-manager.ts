import type {
  Space,
  Component3D,
  AvatarComponent,
  NavmeshComponent,
} from "@oncyberio/engine";
import { Vector3 } from "three";
import { GAME_CONFIG } from "@/lib/game-config";
import { playRandomSound, playSoundOneShot } from "@/lib/audio-manager";
import {
  gameStore,
  setZombieAliveCount,
  incrementZombiesKilled,
  takeDamage,
} from "@/lib/game-store";

const ZOMBIE_SOUNDS = [
  "/assets/sounds/zombies/dragon-studio-zombie-sound-357975.mp3",
  "/assets/sounds/zombies/dragon-studio-zombie-sound-2-357976.mp3",
  "/assets/sounds/zombies/dragon-studio-female-zombie-screams-324744.mp3",
];

const ZOMBIE_DEATH_SOUND =
  "/assets/sounds/zombies/dragon-studio-zombie-dying-sound-357974.mp3";

const HIT_REACTION_DURATION = 0.45;
const ATTACK_ANIM_DURATION = 0.8;

type ZombieAnimState = "idle" | "run" | "attack" | "hit" | "dead";

interface ZombieState {
  component: Component3D;
  health: number;
  isDead: boolean;
  lastAttackTime: number;
  lastSoundTime: number;
  isChasing: boolean;
  animState: ZombieAnimState;
  hitReactionEndTime: number;
  isAttacking: boolean;
  attackAnimEndTime: number;
}

export class ZombieManager {
  private zombies: Map<string, ZombieState> = new Map();
  private space: Space;
  private playerComponent: Component3D;
  private navmesh: NavmeshComponent;
  private agents: Map<string, any> = new Map();
  private onZombieDeath: ((zombie: Component3D) => void) | null = null;

  constructor(
    space: Space,
    playerComponent: Component3D,
    navmesh: NavmeshComponent,
  ) {
    this.space = space;
    this.playerComponent = playerComponent;
    this.navmesh = navmesh;
  }

  setOnZombieDeath(callback: (zombie: Component3D) => void) {
    this.onZombieDeath = callback;
  }

  async spawnZombie(position: {
    x: number;
    y: number;
    z: number;
  }): Promise<Component3D | null> {
    try {
      const zombie = await this.space.components.create({
        type: "avatar",
        id: `zombie-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "Zombie",
        position,
        scale: { x: 0.8, y: 0.8, z: 0.8 },
        url: "https://cyber.mypinata.cloud/ipfs/QmUnXZofhqSJCBTrRi9pZE7ED4fGSCFLLG8Gqf7WW9cDtc?filename=zombie.glb",
        urlCompressed:
          "https://cyber.mypinata.cloud/ipfs/QmamCdzq3WPfYs3ssF5ydW2ehjZGivYWp3zytBZCwcZSur?filename=1684326194956.vrm",
        useCpuAnimation: true,
        renderMode: "default",
        animation: "zombie_idle",
        script: { tag: "enemy" },
        collider: {
          enabled: true,
          rigidbodyType: "KINEMATIC",
          colliderType: "CAPSULE",
        },
      });

      if (!zombie) return null;

      this.zombies.set(zombie.componentId, {
        component: zombie,
        health: GAME_CONFIG.zombieHealth,
        isDead: false,
        lastAttackTime: 0,
        lastSoundTime: 0,
        isChasing: false,
        animState: "idle",
        hitReactionEndTime: 0,
        isAttacking: false,
        attackAnimEndTime: 0,
      });

      // Create navmesh agent so pathfinding drives this zombie's position
      const agent = this.navmesh.createAgent(zombie, {
        radius: 0.5,
        height: 1.8,
        maxSpeed: GAME_CONFIG.zombieSpeed,
        maxAcceleration: 20,
      });
      this.agents.set(zombie.componentId, agent);

      setZombieAliveCount(this.getAliveCount());

      return zombie;
    } catch (err) {
      console.warn("[ZombieManager] Failed to spawn zombie:", err);
      return null;
    }
  }

  private setZombieAnimation(zombie: ZombieState, state: ZombieAnimState) {
    if (zombie.animState === state) return;
    zombie.animState = state;

    const animMap: Record<ZombieAnimState, string> = {
      idle: "zombie_idle",
      run: "zombie_running",
      attack: "zombie_attack",
      hit: "zombie-reaction-hit",
      dead: "zombie_death",
    };

    const avatar = zombie.component as AvatarComponent;
    const clip = animMap[state];

    if (state === "hit" || state === "attack") {
      avatar.play(clip, {
        loop: "once",
        repetitions: 1,
        reset: true,
        stopAll: true,
        clampWhenFinished: false,
        fadeIn: 0.04,
      });
      return;
    }

    if (state === "dead") {
      // Persist the death clip so avatar reloads or mode changes keep the corpse pose.
      // fadeIn/fadeOut: 0 ensures an instant snap with no blending artifacts
      // that could leave the zombie in a mid-air pose.
      avatar.play(clip, {
        loop: "once",
        repetitions: 1,
        reset: true,
        stopAll: true,
        clampWhenFinished: true,
        fadeIn: 0,
        fadeOut: 0,
        persist: true,
      });
      return;
    }

    avatar.play(clip, {
      loop: "repeat",
      reset: true,
      stopAll: true,
      fadeIn: 0.08,
      persist: true,
    });
  }

  damageZombie(componentId: string, amount: number) {
    const zombie = this.zombies.get(componentId);
    if (!zombie || zombie.isDead) return;

    zombie.health -= amount;

    if (zombie.health <= 0) {
      this.killZombie(componentId);
    } else {
      const now = performance.now() / 1000;
      const isAlreadyInHitReaction = zombie.hitReactionEndTime > now;
      zombie.hitReactionEndTime = now + HIT_REACTION_DURATION;
      zombie.isAttacking = false;
      zombie.attackAnimEndTime = 0;

      if (!isAlreadyInHitReaction) {
        this.setZombieAnimation(zombie, "hit");
      }
    }
  }

  private killZombie(componentId: string) {
    const zombie = this.zombies.get(componentId);
    if (!zombie || zombie.isDead) return;

    zombie.isDead = true;
    zombie.isAttacking = false;
    zombie.attackAnimEndTime = 0;
    zombie.hitReactionEndTime = 0;

    // Remove navmesh agent so it stops driving position
    const agent = this.agents.get(componentId);
    if (agent) {
      this.navmesh.removeAgent(agent);
      this.agents.delete(componentId);
    }

    // Update gameplay state immediately on death.
    setZombieAliveCount(this.getAliveCount());
    incrementZombiesKilled();

    // Force-reset animState so the death animation always plays,
    // even if the zombie was somehow already in the "dead" state.
    zombie.animState = "idle";
    this.setZombieAnimation(zombie, "dead");
    playSoundOneShot(ZOMBIE_DEATH_SOUND, 0.5);

    // Drop to ground level so the death animation ends on the floor.
    zombie.component.position.y = 0;

    // Disable the collider so the capsule doesn't interfere with the
    // death animation's visual positioning.
    zombie.component.setData({
      collider: { enabled: false },
    });

    this.onZombieDeath?.(zombie.component);
  }

  update(dt: number) {
    if (gameStore.state.gamePhase !== "playing") return;

    const playerPos = this.playerComponent.position;
    const now = performance.now() / 1000;
    const targetVec = new Vector3();

    this.zombies.forEach((zombie) => {
      if (zombie.isDead) return;

      const agent = this.agents.get(zombie.component.componentId);

      // Hit reaction lock: freeze AI until reaction window ends.
      if (zombie.hitReactionEndTime > now) {
        agent?.reset();
        return;
      }

      // Attack animation playing: zombie stays in place
      if (zombie.isAttacking) {
        if (now >= zombie.attackAnimEndTime) {
          zombie.isAttacking = false;
        } else {
          agent?.reset();
          // Face the player while attacking
          const zombiePos = zombie.component.position;
          const dx = playerPos.x - zombiePos.x;
          const dz = playerPos.z - zombiePos.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance > 0.01) {
            const angle = Math.atan2(dx / distance, dz / distance);
            zombie.component.rotation.y = angle + Math.PI;
          }
          return;
        }
      }

      const zombiePos = zombie.component.position;
      const dx = playerPos.x - zombiePos.x;
      const dz = playerPos.z - zombiePos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      zombie.isChasing = true;

      if (distance > GAME_CONFIG.attackRange) {
        // Chase: navmesh agent pathfinds toward player
        if (agent) {
          targetVec.set(playerPos.x, playerPos.y, playerPos.z);
          const navTarget = this.navmesh?.crowd?.findClosestPoint(targetVec);
          if (navTarget) {
            agent.moveTo(navTarget);
          }
        }

        this.setZombieAnimation(zombie, "run");
      } else {
        // In attack range — stop the agent
        agent?.reset();

        // Face the player
        const dirX = dx / distance;
        const dirZ = dz / distance;
        const angle = Math.atan2(dirX, dirZ);
        zombie.component.rotation.y = angle + Math.PI;

        if (now - zombie.lastAttackTime >= GAME_CONFIG.attackCooldown) {
          // Start attack
          zombie.lastAttackTime = now;
          zombie.isAttacking = true;
          zombie.attackAnimEndTime = now + ATTACK_ANIM_DURATION;
          this.setZombieAnimation(zombie, "attack");
          takeDamage(GAME_CONFIG.attackDamage);
        } else {
          // Cooldown idle between attacks
          this.setZombieAnimation(zombie, "idle");
        }
      }

      // Periodic zombie sounds while chasing
      if (now - zombie.lastSoundTime > 4 + Math.random() * 3) {
        zombie.lastSoundTime = now;
        playRandomSound(ZOMBIE_SOUNDS, 0.3);
      }
    });
  }

  getZombieByComponentId(componentId: string): ZombieState | undefined {
    return this.zombies.get(componentId);
  }

  private getAliveCount(): number {
    let count = 0;
    this.zombies.forEach((z) => {
      if (!z.isDead) count++;
    });
    return count;
  }

  get aliveCount(): number {
    return this.getAliveCount();
  }

  damageZombiesInRadius(
    center: { x: number; y: number; z: number },
    radius: number,
    damage: number,
  ) {
    this.zombies.forEach((zombie, id) => {
      if (zombie.isDead) return;
      const pos = zombie.component.position;
      const dx = pos.x - center.x;
      const dz = pos.z - center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= radius) {
        this.damageZombie(id, damage);
      }
    });
  }

  dispose() {
    // Remove all navmesh agents before destroying zombie components
    this.agents.forEach((agent) => {
      try {
        this.navmesh.removeAgent(agent);
      } catch (_) {}
    });
    this.agents.clear();

    this.zombies.forEach((zombie) => {
      try {
        zombie.component.destroy();
      } catch (_) {}
    });
    this.zombies.clear();
  }
}
