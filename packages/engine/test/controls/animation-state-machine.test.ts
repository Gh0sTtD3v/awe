import { AnimationStateMachine } from "../../src/controls/animation-state-machine";

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

describe("AnimationStateMachine", () => {
  it("event transitions: respects priority+guards and can transition multiple times in one update (one per queued event)", () => {
    const { body } = createAvatarStub();

    const entered: Array<{ state: string; stateTime: number; previousState: string | null }> =
      [];

    const machine = new AnimationStateMachine<{ allowJump: boolean }>({
      body: body as any,
      initial: "idle",
      context: { allowJump: false },
      states: {
        idle: {
          clip: "idle",
          onEnter: (ctx) => entered.push({ state: "idle", stateTime: ctx.stateTime, previousState: ctx.previousState }),
        },
        run: {
          clip: "run",
          onEnter: (ctx) => entered.push({ state: "run", stateTime: ctx.stateTime, previousState: ctx.previousState }),
        },
        jump: {
          clip: "jump",
          onEnter: (ctx) => entered.push({ state: "jump", stateTime: ctx.stateTime, previousState: ctx.previousState }),
        },
      },
      transitions: [
        { from: "idle", to: "jump", on: "go", priority: 10, guard: (ctx) => ctx.allowJump },
        { from: "idle", to: "run", on: "go", priority: 0 },
        { from: "jump", to: "idle", on: "land" },
      ],
    });

    entered.length = 0;
    machine.send("go");
    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");

    machine.forceState("idle");
    machine.setContext({ allowJump: true });

    entered.length = 0;
    machine.send("go");
    machine.send("land");
    machine.update(1 / 60);

    expect(machine.currentState).toBe("idle");
    expect(machine.previousState).toBe("jump");

    const jumpEnter = entered.find((e) => e.state === "jump");
    const idleEnter = entered
      .filter((e) => e.state === "idle")
      .at(-1);

    expect(jumpEnter?.stateTime).toBe(0);
    expect(idleEnter?.stateTime).toBe(0);
  });

  it("condition transitions: evaluates by priority and performs at most one condition transition per frame", () => {
    const { body } = createAvatarStub();

    const machine = new AnimationStateMachine<{ speed: number }>({
      body: body as any,
      initial: "idle",
      context: { speed: 0 },
      states: {
        idle: { clip: "idle" },
        run: { clip: "run" },
        slide: { clip: "slide" },
      },
      transitions: [
        { from: "idle", to: "run", when: (ctx) => ctx.speed > 0.5, priority: 0 },
        { from: "idle", to: "slide", when: (ctx) => ctx.speed > 0.5, priority: 10 },
        { from: "slide", to: "run", when: () => true, priority: 0 },
      ],
    });

    machine.setContext({ speed: 1 });
    machine.update(1 / 60);
    expect(machine.currentState).toBe("slide");

    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");
  });

  it("condition transitions: same-priority transitions use declaration order", () => {
    const { body } = createAvatarStub();

    const machine = new AnimationStateMachine<{ shouldMove: boolean }>({
      body: body as any,
      initial: "idle",
      context: { shouldMove: false },
      states: {
        idle: { clip: "idle" },
        walk: { clip: "walk" },
        run: { clip: "run" },
      },
      transitions: [
        { from: "idle", to: "walk", when: (ctx) => ctx.shouldMove },
        { from: "idle", to: "run", when: (ctx) => ctx.shouldMove },
      ],
    });

    machine.setContext({ shouldMove: true });
    machine.update(1 / 60);

    expect(machine.currentState).toBe("walk");
  });

  it("finished flag: set via avatar play callback, drives transitions, and resets on transition", () => {
    const { body, playCalls } = createAvatarStub();

    const machine = new AnimationStateMachine({
      body: body as any,
      initial: "jump",
      states: {
        jump: { clip: "jump", loop: "once" },
        idle: { clip: "idle" },
      },
      transitions: [{ from: "jump", to: "idle", when: (ctx) => ctx.finished }],
    });

    const jumpPlay = playCalls.at(-1);
    expect(jumpPlay?.clip).toBe("jump");
    expect(jumpPlay?.opts?.persist).toBe(true);

    const callback = jumpPlay?.opts?.callback as undefined | ((opts: { type: string }) => void);
    expect(typeof callback).toBe("function");

    callback!({ type: "finished" });
    expect(machine.finished).toBe(true);

    machine.update(1 / 60);
    expect(machine.currentState).toBe("idle");
    expect(machine.finished).toBe(false);
  });

  it("state clip resolver: receives merged context and picks the clip at state entry", () => {
    const { body, playCalls } = createAvatarStub();

    const machine = new AnimationStateMachine<{ variant: "idle" | "run" }>({
      body: body as any,
      initial: "air",
      context: { variant: "idle" },
      states: {
        air: { clip: "jump" },
        locomotion: {
          clip: (ctx) => (ctx.variant === "run" ? "run" : "idle"),
        },
      },
      transitions: [],
    });

    expect(playCalls.at(-1)?.clip).toBe("jump");

    machine.setContext({ variant: "run" });
    machine.forceState("locomotion");

    expect(playCalls.at(-1)?.clip).toBe("run");
  });

  it("blend time precedence: transition override > state blendTime > default blend time", () => {
    const { body, playCalls } = createAvatarStub();

    const machine = new AnimationStateMachine<{ toRun: boolean; toDash: boolean; toIdle: boolean }>({
      body: body as any,
      initial: "idle",
      context: { toRun: false, toDash: false, toIdle: false },
      defaultBlendTime: 0.5,
      states: {
        idle: { clip: "idle", blendTime: 0.2 },
        run: { clip: "run" },
        dash: { clip: "dash" },
      },
      transitions: [
        { from: "idle", to: "run", when: (ctx) => ctx.toRun },
        { from: "run", to: "dash", when: (ctx) => ctx.toDash, blendTime: 0.33 },
        { from: "dash", to: "idle", when: (ctx) => ctx.toIdle },
      ],
    });

    expect(playCalls.at(-1)?.opts?.fadeIn).toBe(0.2);
    expect(playCalls.at(-1)?.opts?.persist).toBe(true);

    machine.setContext({ toRun: true });
    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");
    expect(playCalls.at(-1)?.opts?.fadeIn).toBe(0.5);
    expect(playCalls.at(-1)?.opts?.persist).toBe(true);

    machine.setContext({ toRun: false, toDash: true });
    machine.update(1 / 60);
    expect(machine.currentState).toBe("dash");
    expect(playCalls.at(-1)?.opts?.fadeIn).toBe(0.33);
    expect(playCalls.at(-1)?.opts?.persist).toBe(true);

    machine.setContext({ toDash: false, toIdle: true });
    machine.update(1 / 60);
    expect(machine.currentState).toBe("idle");
    expect(playCalls.at(-1)?.opts?.fadeIn).toBe(0.2);
    expect(playCalls.at(-1)?.opts?.persist).toBe(true);
  });

  it("enabled toggle: does not process pending events while disabled, and preserves the queue until re-enabled", () => {
    const { body } = createAvatarStub();

    const machine = new AnimationStateMachine({
      body: body as any,
      initial: "idle",
      states: {
        idle: { clip: "idle" },
        run: { clip: "run" },
      },
      transitions: [{ from: "idle", to: "run", on: "go" }],
    });

    machine.send("go");
    machine.enabled = false;
    machine.update(1 / 60);
    expect(machine.currentState).toBe("idle");

    machine.enabled = true;
    machine.update(1 / 60);
    expect(machine.currentState).toBe("run");
  });
});
