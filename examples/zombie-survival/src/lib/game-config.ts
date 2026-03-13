export interface GameConfig {
  // Player
  playerMaxHealth: number;
  playerWalkSpeed: number;
  playerSprintSpeed: number;
  playerJumpForce: number;

  // Weapon
  gunDamage: number;
  fireRate: number;
  ammoCapacity: number;
  reloadTime: number;
  weaponView: {
    assetUrl: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
    muzzleFlashPosition: { x: number; y: number; z: number };
  };
  weaponAnimations: {
    draw: string;
    inspect: string;
    idle: string;
    walk: string;
    run: string;
    sprint: string;
    fire: string;
    reloadPartial: string;
    reloadFull: string;
  };

  // Zombie
  zombieHealth: number;
  zombieSpeed: number;
  detectRadius: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;

  // Match
  matchDuration: number;
  initialZombies: number;
  spawnInterval: number;
  spawnBatchSize: number;
  maxZombies: number;
  spawnMinDistanceFromPlayer: number;

  // Explosions
  explosionRadius: number;
  explosionDamage: number;
}

export const GAME_CONFIG: GameConfig = {
  // Player
  playerMaxHealth: 100,
  playerWalkSpeed: 7,
  playerSprintSpeed: 14,
  playerJumpForce: 5,

  // Weapon
  gunDamage: 25,
  fireRate: 0.2,
  ammoCapacity: 30,
  reloadTime: 2,
  weaponView: {
    assetUrl: "/assets/fps_animations_lowpoly_mp5.glb",
    // Centered iron-sights view — weapon aligned straight down the barrel.
    position: { x: 0, y: -0.28, z: -0.4 },
    rotation: { x: 0, y: Math.PI, z: 0 },
    scale: 0.5,
    muzzleFlashPosition: { x: 0, y: 0.06, z: -0.3 },
  },
  weaponAnimations: {
    draw: "Arms_Draw",
    inspect: "Arms_Inspect",
    idle: "Arms_Idle",
    walk: "Arms_Walk",
    run: "Arms_Run",
    sprint: "Arms_Sprint",
    fire: "Arms_Fire",
    reloadPartial: "Arms_notfullreload",
    reloadFull: "Arms_fullreload",
  },

  // Zombie
  zombieHealth: 100,
  zombieSpeed: 3,
  detectRadius: 30,
  attackRange: 2,
  attackDamage: 10,
  attackCooldown: 1.5,

  // Match
  matchDuration: 300,
  initialZombies: 10,
  spawnInterval: 30,
  spawnBatchSize: 5,
  maxZombies: 30,
  spawnMinDistanceFromPlayer: 20,

  // Explosions
  explosionRadius: 8,
  explosionDamage: 150,
};
