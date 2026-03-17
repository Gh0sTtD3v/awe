import type { Game } from "../@types/game";
import { deepEqual } from "../internal/utils/js";
import type { Space } from "./space";

const ignoredKeys = {
  id: true,
  type: true,
  kit: true,
  _version: true,
  children: true,
};

export interface ComponentRecordDiff {
  added: string[];
  removed: string[];
  updated: Record<string, any>;
}

export function diffComponentData(
  prev: Record<string, any>,
  next: Record<string, any>
) {
  let diff = null;

  Object.keys(prev).forEach((key) => {
    if (ignoredKeys[key]) {
      return;
    }

    if (!deepEqual(prev[key], next[key])) {
      diff ??= {};
      diff[key] = next[key];
    }
  });

  return diff;
}

export function diffGameComponents(
  prevComponents: Record<string, any>,
  nextComponents: Record<string, any>
): ComponentRecordDiff {
  const diff: ComponentRecordDiff = {
    added: [],
    removed: [],
    updated: {},
  };

  Object.keys(prevComponents).forEach((id) => {
    if (!nextComponents[id]) {
      diff.removed.push(id);
      return;
    }

    const delta = diffComponentData(prevComponents[id], nextComponents[id]);

    if (delta) {
      diff.updated[id] = delta;
    }
  });

  Object.keys(nextComponents).forEach((id) => {
    if (!prevComponents[id]) {
      diff.added.push(id);
    }
  });

  return diff;
}

export function applyGameDataToSpace(
  space: Space,
  prevGameData: Game,
  nextGameData: Game
) {
  const diff = diffGameComponents(
    prevGameData.components,
    nextGameData.components
  );

  diff.added.forEach((id) => {
    space.components.create(nextGameData.components[id]);
  });

  diff.removed.forEach((id) => {
    const instance = space.components.byInternalId(id);

    if (instance) {
      space.components.destroy(instance);
    }
  });

  Object.keys(diff.updated).forEach((id) => {
    const instance = space.components.byInternalId(id);

    if (!instance) {
      return;
    }

    instance.setData(diff.updated[id]);
  });
}

export class Hot {
  //
  space: Space;
  gameData: Game;
  _disp: Function;

  constructor(space: Space, gameData: Game) {
    //
    this.space = space;
    this.gameData = gameData;
  }

  async init() {
    //
    const onMessage = (event) => {
      //
      if (event.data.type === `game-data-${this.gameData.id}`) {
        //
        //console.log("SpaceHot: game data", event.data.data);
        this.onNewGameData(event.data.data);
      }
    };

    window.addEventListener("message", onMessage);

    this._disp = () => {
      //
      window.removeEventListener("message", onMessage);
    };
  }

  onNewGameData(gameData: Game) {
    //
    const prevData = this.gameData;
    this.gameData = gameData;

    applyGameDataToSpace(this.space, prevData, this.gameData);
  }

  dispose() {
    //
    this._disp();
  }
}
