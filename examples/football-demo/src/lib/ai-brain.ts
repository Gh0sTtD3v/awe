// Pure AI decision logic — no engine dependencies, fully testable.

export interface Vec2 {
  x: number;
  z: number;
}

export interface AIConfig {
  speed: number;
  kickForce: number;
  kickRange: number;
  kickCooldown: number;
  playerSeparation: number;
  fieldBounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** Z coordinate of the goal the AI is attacking */
  targetGoalZ: number;
}

export interface AIState {
  aiPos: Vec2;
  ballPos: Vec2;
  playerPos: Vec2 | null;
  kickCooldown: number;
  isResetting: boolean;
  wasMoving: boolean;
  hadBallControl: boolean;
}

export interface AIResult {
  position: Vec2;
  facingAngle: number | null;
  isMoving: boolean;
  moveSpeed: number;
  hasBallControl: boolean;
  kick: { dirX: number; dirY: number; dirZ: number } | null;
  kickCooldown: number;
}

export function updateAI(
  state: AIState,
  dt: number,
  config: AIConfig,
): AIResult {
  if (state.isResetting) {
    return {
      position: state.aiPos,
      facingAngle: null,
      isMoving: false,
      moveSpeed: 0,
      hasBallControl: false,
      kick: null,
      kickCooldown: state.kickCooldown,
    };
  }

  let cooldown = Math.max(0, state.kickCooldown - dt);

  const { aiPos, ballPos, playerPos } = state;

  // Direction from AI to ball
  const toBallX = ballPos.x - aiPos.x;
  const toBallZ = ballPos.z - aiPos.z;
  const distToBall = Math.sqrt(toBallX * toBallX + toBallZ * toBallZ);

  // Kick direction: from ball toward target goal
  const kickDirZ = config.targetGoalZ - ballPos.z;
  const kickDirLen = Math.abs(kickDirZ) || 1;
  const kickNZ = kickDirZ / kickDirLen;
  // Keep the kick gate at approximate collider contact in XZ space rather
  // than the much larger gameplay kick range.
  const kickContactDistance = Math.min(config.kickRange, 0.55);
  const kickSetupDistance = kickContactDistance;
  const ballControlStartDistance = kickContactDistance + 0.15;
  const ballControlStopDistance = kickContactDistance + 0.35;

  // AI should be on the opposite side of the ball from the goal
  // (if attacking toward -Z, AI should be at +Z relative to ball)
  const aiBehindBallDistance = (aiPos.z - ballPos.z) * -kickNZ;
  const aiOnGoalSideOfBall = aiBehindBallDistance >= -0.02;
  const hasBallControl = aiOnGoalSideOfBall && (
    state.hadBallControl
      ? distToBall <= ballControlStopDistance
      : distToBall <= ballControlStartDistance
  );

  // --- Movement target ---
  let moveTargetX: number;
  let moveTargetZ: number;
  const approachRange = config.kickRange * 2;
  const isContactApproach = hasBallControl;
  const contactTrackStartDistance = 0.015;
  const contactTrackStopDistance = 0.003;
  const moveStartDistance = 0.12;
  const moveStopDistance = 0.04;
  const chaseStartBuffer = 0.25;
  const chaseStopBuffer = 0.1;

  if (distToBall > approachRange) {
    // Far away: chase ball directly
    moveTargetX = ballPos.x;
    moveTargetZ = ballPos.z;
  } else if (isContactApproach) {
    // Once aligned behind the ball, finish the approach into contact instead
    // of parking at the setup point just outside the kick gate.
    moveTargetX = ballPos.x;
    moveTargetZ = ballPos.z;
  } else {
    // Close: move to kick position behind the ball
    moveTargetX = ballPos.x;
    moveTargetZ = ballPos.z - kickNZ * kickSetupDistance;
  }

  const toTargetX = moveTargetX - aiPos.x;
  const toTargetZ = moveTargetZ - aiPos.z;
  const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);

  // --- Kick decision ---
  let kick: AIResult["kick"] = null;
  if (
    distToBall <= kickContactDistance &&
    cooldown <= 0 &&
    aiOnGoalSideOfBall
  ) {
    kick = computeKickDirection(ballPos, config);
    cooldown = config.kickCooldown;
  }

  // Use hysteresis so tiny target jitter near the stop radius does not thrash
  // the animation state between idle and run.
  const wantsToMove = isContactApproach
    ? state.wasMoving
      ? distToTarget > contactTrackStopDistance
      : distToTarget > contactTrackStartDistance
    : state.wasMoving
      ? cooldown > 0
        ? distToBall > kickContactDistance + chaseStopBuffer
        : distToTarget > moveStopDistance
      : cooldown > 0
        ? distToBall > kickContactDistance + chaseStartBuffer
        : distToTarget > moveStartDistance;

  let newX = aiPos.x;
  let newZ = aiPos.z;

  if (wantsToMove) {
    const moveNorm = Math.max(distToTarget, 0.01);
    const moveStep = Math.min(config.speed * dt, distToTarget);
    newX += (toTargetX / moveNorm) * moveStep;
    newZ += (toTargetZ / moveNorm) * moveStep;
  }

  // Push away from player to prevent overlap
  if (playerPos) {
    const dx = newX - playerPos.x;
    const dz = newZ - playerPos.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);
    if (distToPlayer < config.playerSeparation && distToPlayer > 0.01) {
      const pushScale = (config.playerSeparation - distToPlayer) / distToPlayer;
      newX += dx * pushScale;
      newZ += dz * pushScale;
    }
  }

  // Clamp within field bounds
  const { xMin, xMax, zMin, zMax } = config.fieldBounds;
  newX = Math.max(xMin, Math.min(xMax, newX));
  newZ = Math.max(zMin, Math.min(zMax, newZ));

  // Detect actual displacement
  const movedX = newX - aiPos.x;
  const movedZ = newZ - aiPos.z;
  const movedDist = Math.sqrt(movedX * movedX + movedZ * movedZ);

  // If the AI wants to move but is stuck at a field boundary (zero
  // displacement despite a distant target), report movement intent so the
  // animation still shows chasing instead of going idle.
  const stuckAtBoundary =
    wantsToMove && movedDist <= 0.001 && distToTarget > 0.5;
  const moveSpeed = stuckAtBoundary
    ? config.speed
    : dt > 0
      ? movedDist / dt
      : 0;
  const isMoving = wantsToMove && (movedDist > 0.0005 || stuckAtBoundary);

  const facingAngle = isMoving
    ? movedDist > 0.0005
      ? Math.atan2(movedX, movedZ) + Math.PI
      : Math.atan2(toTargetX, toTargetZ) + Math.PI
    : null;

  return {
    position: { x: newX, z: newZ },
    facingAngle,
    isMoving,
    moveSpeed,
    hasBallControl,
    kick,
    kickCooldown: cooldown,
  };
}

export function computeKickDirection(
  ballPos: Vec2,
  config: AIConfig,
  random = Math.random,
): { dirX: number; dirY: number; dirZ: number } {
  const targetX = (random() - 0.5) * 6;
  const dx = targetX - ballPos.x;
  const dy = 0.2;
  const dz = config.targetGoalZ - ballPos.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    dirX: (dx / len) * config.kickForce,
    dirY: (dy / len) * config.kickForce,
    dirZ: (dz / len) * config.kickForce,
  };
}
