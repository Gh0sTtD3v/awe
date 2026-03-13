const IDLE = {
    name: "IDLE",

    loop: true,
};

const RUN = {
    name: "RUN",

    loop: true,
};

const WALK = {
    name: "WALK",

    timeScale: 1,

    loop: true,
};

const JUMP = {
    name: "JUMP",

    timeScale: 0.5,

    loop: true,

    resetOnFloor: true,

    fadeRatio: 0.8,
};

const FLY = {
    name: "FLY",

    loop: true,
};

const SITTING = {
    name: "SITTING",

    timeScale: 1,

    loop: true,

    sync: false,
};

export { IDLE, RUN, WALK, JUMP, FLY, SITTING };
