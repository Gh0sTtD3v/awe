import type { Game } from "../@types/game";
import { deepEqual } from "../internal/utils/js";
import type { Space } from "./space";

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

    this.diffComponents(prevData.components, this.gameData.components);
  }

  diffComponents(
    prevComponents: Record<string, any>,
    newComponents: Record<string, any>
  ) {
    //
    const diff = this._diffRecord(prevComponents, newComponents);

    console.log("hot reload diff", diff);

    diff.added.forEach((id) => {
      //
      this.space.components.create(newComponents[id]);
    });

    diff.removed.forEach((id) => {
      //
      const instance = this.space.components.byInternalId(id);

      this.space.components.destroy(instance);
    });

    Object.keys(diff.updated).forEach((id) => {
      //
      const delta = diff.updated[id];

      const instance = this.space.components.byInternalId(id);

      instance.setData(delta);
    });
  }

  private _diffRecord(prev: Record<string, any>, next: Record<string, any>) {
    //
    const diff = {
      added: [],
      removed: [],
      updated: {} as Record<string, any>,
    };

    Object.keys(prev).forEach((id) => {
      //
      if (!next[id]) {
        diff.removed.push(id);
      } else {
        //
        let delta = this.diffObject(prev[id], next[id]);

        if (delta) {
          diff.updated[id] = delta;
        }
      }
    });

    Object.keys(next).forEach((id) => {
      //
      if (!prev[id]) {
        diff.added.push(id);
      }
    });

    return diff;
  }

  _ignoreKeys = {
    id: true,
    type: true,
    kit: true,
    _version: true,
    children: true,
  };

  diffObject(prev: Record<string, any>, next: Record<string, any>) {
    //
    let diff = null;

    Object.keys(prev).forEach((key) => {
      //
      if (this._ignoreKeys[key]) {
        return;
      }

      if (!deepEqual(prev[key], next[key])) {
        diff ??= {};
        diff[key] = next[key];
      }
    });

    return diff;
  }

  dispose() {
    //
    this._disp();
  }
}
