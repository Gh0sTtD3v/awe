import { createMoverAnimStateMachine } from "../../src/controls/mover-anim-state";

type AvatarStub = {
  data: { type: "avatar" };
  play: ReturnType<typeof vi.fn>;
};

function createAvatarStub() {
  const playCalls: Array<{ clip: string; opts: any }> = [];

  const body: AvatarStub = {
    data: { type: "avatar" },
    play: vi.fn((clip: string, opts: any) => {
      playCalls.push({ clip, opts });
    }),
  };

  return { body, playCalls };
}

function createMoverStub() {
  const listeners = new Map<string, Function[]>();

  return {
    grounded: true,
    speed: 0,
    velocity: { y: 0 },
    on(event: string, callback: Function) {
      const handlers = listeners.get(event) ?? [];
      handlers.push(callback);
      listeners.set(event, handlers);
    },
    off(event: string, callback: Function) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    },
    emit(event: string, ...args: unknown[]) {
      for (const handler of listeners.get(event) ?? []) {
        handler(...args);
      }
    },
  } as any;
}

describe("createMoverAnimStateMachine", () => {
  it("listens to mover jumps and returns directly to locomotion when no landing phase is configured", () => {
    const { body } = createAvatarStub();
    const mover = createMoverStub();
    mover.speed = 9;

    const machine = createMoverAnimStateMachine({
      body: body as any,
      mover,
      locomotionClips: {
        idle: "idle",
        walk: "walk",
        run: "run",
        sprint: "sprint",
      },
      resolveLocomotionState: (ctx) => {
        if (ctx.mover.speed >= 8) return "run";
        if (ctx.mover.speed >= 0.5) return "walk";
        return "idle";
      },
      jump: {
        clip: "jump",
        toFallWhen: (ctx) => !ctx.mover.grounded && ctx.mover.velocity.y < 0,
      },
      fall: {
        clip: "fall",
        fromGroundWhen: (ctx) => !ctx.mover.grounded,
      },
    });

    mover.grounded = false;
    mover.emit("jumped", 1);
    machine.update(1 / 60);
    expect(machine.currentState).toBe("jump");

    mover.grounded = true;
    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");
  });

  it("exposes latched takeoff state and landing velocity in helper context", () => {
    const { body, playCalls } = createAvatarStub();
    const mover = createMoverStub();

    const machine = createMoverAnimStateMachine({
      body: body as any,
      mover,
      locomotionThresholds: {
        walk: 4,
        sprint: 12,
      },
      locomotionClips: {
        idle: "idle",
        walk: "walk",
        run: "run",
        sprint: "sprint",
      },
      jump: {
        clip: (ctx) =>
          ctx.jumpTakeoffState === "run" ? "jump_run" : "jump_idle",
        toFallWhen: (ctx) => !ctx.mover.grounded && ctx.mover.velocity.y < 0,
      },
      fall: {
        clip: "fall",
        fromGroundWhen: (ctx) => !ctx.mover.grounded,
      },
      landing: {
        clip: (ctx) =>
          ctx.landingVelocityY < -1 ? "landing_hard" : "landing_soft",
      },
    });

    mover.grounded = false;
    mover.speed = 10;
    mover.velocity.y = 2;
    mover.emit("jumped", 1);
    machine.update(1 / 60);
    expect(machine.currentState).toBe("jump");
    expect(playCalls.at(-1)?.clip).toBe("jump_run");

    mover.velocity.y = -2;
    machine.update(1 / 60);
    expect(machine.currentState).toBe("falling");

    mover.grounded = true;
    machine.update(1 / 60);
    expect(machine.currentState).toBe("landing");
    expect(playCalls.at(-1)?.clip).toBe("landing_hard");

    machine.update(1 / 60);
    expect(machine.currentState).toBe("landing");

    const callback = playCalls.at(-1)?.opts?.callback as
      | undefined
      | ((opts: { type: string }) => void);
    callback?.({ type: "finished" });

    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");
  });
});
