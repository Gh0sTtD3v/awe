import Emitter from "events";
import { produce, setAutoFreeze, freeze, produceWithPatches } from "immer";
import { enablePatches, Draft, Patch, applyPatches } from "immer";
import { ComponentData, GameData } from "../../types/game-data";
import { Failure, Result, Success } from "../result";
import { ClientGameService } from "../../services/client-game-service";
import { GameTreeModel } from "./game-tree-model";
import { deepEqual } from "../js";

const sp = new URLSearchParams(window.location.search);

let memory = sp.has("memory");

enablePatches();

setAutoFreeze(true);

export interface StoreOpts {
  gameData: GameData;
  userId: string;
  isAnonymous: boolean;
}

export interface SyncRemoteGameDataResult {
  changed: boolean;
  componentsChanged: boolean;
  skipped: boolean;
}

type UpdateCallback = (res: Result<true>) => unknown;

class Update {
  //
  public cbs: Array<UpdateCallback>;

  public scope: any = {};
  public components: Record<string, Patch[]> = {};

  constructor(
    public patches: Patch[],
    cbs: UpdateCallback | Array<UpdateCallback>
  ) {
    //
    this.cbs = Array.isArray(cbs) ? cbs : [cbs];

    for (let i = 0; i < this.patches.length; i++) {
      //
      const p = this.patches[i];

      let scope = p.path?.[0];

      if (scope != null) {
        //
        this.scope[scope] = true;

        if (scope === "components") {
          let id = String(p.path[1]);
          if (p.path.length >= 4 && id?.startsWith("$$batch-")) {
            id = String(p.path[3]);
          }

          this.components[id] ??= [];
          this.components[id].push(p);
        }
      }
    }
  }

  hasComponent(id: string) {
    //
    return this.components[id];
  }

  static merge(compressed: Patch[], updates: Update[]) {
    //
    return new Update(
      compressed,
      updates.flatMap((u) => u.cbs)
    );
  }
}

type Task = () => Promise<any>;

const STATE_EVENT = "state-event";

export class GameDataStore {
  //
  baseState: GameData;

  _gameData: GameData;

  localPatchSet: Update[] = [];

  taskQueue: Update[] = [];

  isFlushing: boolean = false;

  flushTimeout: any;

  debounceDelay = 500;

  emitter = new Emitter();

  _newSpace = false;

  private _treeModel: GameTreeModel;

  //
  constructor(public opts: StoreOpts) {
    //

    const gameData = { ...opts.gameData } as GameData;

    freeze(gameData, true);

    this.baseState = gameData;
    this._gameData = gameData;

    this._treeModel = new GameTreeModel(this);
  }

  get userId() {
    //
    return this.opts.userId;
  }

  get isAnonymous() {
    //
    return this.opts.isAnonymous;
  }

  get treeModel() {
    //
    return this._treeModel;
  }

  get gameData() {
    //
    return this._gameData;
  }

  subscribe = (cb) => {
    //

    this.emitter.on(STATE_EVENT, cb);

    return () => this.emitter.off(STATE_EVENT, cb);
  };

  getState = () => {
    //
    return this.gameData;
  };

  isLocalPending(id: string) {
    //
    return this.localPatchSet.some((u) => u.hasComponent(id));
  }

  isFlushingPending(id: string) {
    //
    return this.taskQueue.some((u) => u.hasComponent(id));
  }

  isPending(id: string) {
    //
    return this.isLocalPending(id) || this.isFlushingPending(id);
  }

  hasPendingChanges() {
    return (
      this.localPatchSet.length > 0 ||
      this.taskQueue.length > 0 ||
      this.isFlushing
    );
  }

  syncRemoteGameData(nextGameData: GameData): SyncRemoteGameDataResult {
    if (this.hasPendingChanges()) {
      return {
        changed: false,
        componentsChanged: false,
        skipped: true,
      };
    }

    const currentGameData = this._gameData;
    const componentsChanged = !deepEqual(
      currentGameData.components,
      nextGameData.components
    );
    const changed = !deepEqual(currentGameData, nextGameData);

    if (!changed) {
      return {
        changed: false,
        componentsChanged: false,
        skipped: false,
      };
    }

    const gameData = { ...nextGameData } as GameData;

    freeze(gameData, true);

    this.baseState = gameData;
    this._gameData = gameData;

    this.emitter.emit(STATE_EVENT, this.gameData);

    return {
      changed: true,
      componentsChanged,
      skipped: false,
    };
  }

  updateGameData = (recipe: (state: Draft<GameData>) => void) => {
    //
    return new Promise((resolve, reject) => {
      //
      this.updateLocal(recipe, resolve, reject);

      this.updateRemote();
    });
  };

  private updateLocal(
    recipe: (state: Draft<GameData>) => void,
    resolve?: (v?: unknown) => void,
    reject?: (err: Error) => void
  ) {
    //
    let [gameData, patches] = produceWithPatches(this._gameData, recipe);

    this._gameData = gameData;

    if (patches.length) {
      //
      this.localPatchSet.push(
        //
        new Update(patches, (res) => {
          //
          if (res.success === true) resolve?.();
          else reject?.(new Error(res.error));
        })
      );

      this.emitter.emit(STATE_EVENT, this.gameData);
    }
  }

  private updateRemote() {
    //
    clearTimeout(this.flushTimeout);

    this.flushTimeout = setTimeout(() => {
      //
      this.flushPatches();
    }, this.debounceDelay);
  }

  private async flushPatches() {
    //
    if (this.localPatchSet.length === 0) return;

    let patches: Patch[];

    const toPersist: Update[] = this.localPatchSet;

    this.localPatchSet = [];

    if (toPersist.length > 0) {
      //
      this.baseState = produce(
        this.baseState,
        (draft) => {
          //
          applyPatches(
            draft,
            toPersist.flatMap((u) => u.patches)
          );
        },
        (_patches) => {
          //
          patches = _patches;
        }
      );

      if (patches.length) {
        //
        const task = new Update(
          patches,
          toPersist.flatMap((u) => u.cbs)
        );

        // console.log("flush patches", patches);

        this.taskQueue.push(task);

        this.flushTasks();
      }
    }
  }

  didError = null;

  private async flushTasks() {
    //
    if (this.isFlushing) return;

    try {
      this.isFlushing = true;

      while (this.taskQueue.length) {
        //
        let next = this.taskQueue.shift();

        try {
          console.log("sending patches", next.patches);

          if (!memory) {
            await ClientGameService.updateGame({
              id: this.gameData.id,
              patches: next.patches as any,
            });
          } else {
            //
            //
          }

          let res = Success(true as const);

          next.cbs.forEach((cb) => cb(res));
          //
        } catch (err) {
          //
          console.error(err);

          let res = Failure(err.message);

          next.cbs.forEach((cb) => cb(res));

          return;
        }
      }
    } finally {
      //
      this.isFlushing = false;
    }
  }

  resetState() {
    //
    clearTimeout(this.flushTimeout);

    this.localPatchSet.length = 0;

    this.taskQueue.length = 0;

    this._gameData = this.baseState;

    this.isFlushing = false;

    this.emitter.emit(STATE_EVENT, this.gameData);
  }

  dispose() {}
}
