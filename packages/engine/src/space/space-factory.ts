import { Space } from "./space";
import { ComponentManager } from "./components/index";
import { ChunkManager } from "./chunk-manager";
import { Physics } from "../physics/index";
import { DEBUG_PHYSICS } from "../internal/constants";
import { ComponentsRegistry } from "./registry/index";
import type { PhysicsEngine } from "../physics/types";
import { SpaceOpts } from "../@types/space-opts";
import { Game } from "../@types/game";
import Camera from "../camera";
import emitter from "../internal/engine-emitter";
import { EngineEvents } from "../internal/engine-events";
import { SpaceLifecycle } from "./space-lifecycle";
import type { Hot } from "./hot-reload";

class SpaceFactory {
  //
  current: Space;
  hot: Hot;

  physics: PhysicsEngine;

  async get(opts: SpaceOpts) {
    //
    if (this.current) {
      //
      throw new Error("Space already exists (dispose it first)");
    }

    // When chunked, only build global components initially.
    // Chunk-specific components are streamed in by ChunkManager.
    const components = opts.chunked
      ? ChunkManager.filterGlobals(opts.game.components)
      : opts.game.components;

    const componentData = this._buildTree(components);

    // TO DO
    // Load recursively inside the actual config into the components, instead of calling the factory directly
    // This is part of the component refactoring

    const space = new Space(opts);
    space.name = "SPACE";
    this.current = space;

    // Create space lifecycle
    space._lifecycle = new SpaceLifecycle(space);

    const { components: componentDefs } =
      opts.runtime === "headless"
        ? await import("./components/components-core")
        : await import("./components/components-web");

    space.registry = new ComponentsRegistry({ space, components: componentDefs });

    const physics = Physics.get({
      type: "rapier",
      debug: DEBUG_PHYSICS,
    });

    await physics.init();

    space.physics = physics;

    space.components = new ComponentManager({
      ...opts,
      data: componentData,
      space,
      loadOpts: opts.loadOpts,
    });

    await space.components._build();

    // Initialize space lifecycle after components are built
    space._lifecycle.init();

    // Initialize chunk manager when chunked
    if (opts.chunked) {
      const chunks = new ChunkManager();
      space.chunks = chunks;
      chunks.init(space);
    }

    if (opts.runtime !== "headless") {
      const { Hot } = await import("./hot-reload");
      this.hot = new Hot(space, opts.game);
      this.hot.init();
    }

    return space;
  }

  disposables = [];

  dispose(space: Space) {
    // Emit GAME_DISPOSE so listeners can clean up
    emitter.emit(EngineEvents.GAME_DISPOSE);

    for (let disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables = [];

    this.hot?.dispose();

    // Dispose space lifecycle
    space?._lifecycle?.dispose();
    if (space) {
      space._lifecycle = null;
    }

    space?.components?.dispose();

    Physics.dispose();

    space?.physics?.dispose();

    space?.registry?.dispose();

    space?.dispose();

    Camera.reset();

    this.current = null;
  }

  private _buildTree(data: Record<string, any>) {
    //
    const roots = {};

    Object.values(data).forEach((res) => {
      //
      if (!res.parentId) {
        //
        roots[res.id] = res;
        //
      } else {
        //
        const parent = data[res.parentId];

        if (parent == null) {
          //
          console.error(`Invalid parent id: ${res.parentId}`);

          return;
        }

        parent.children ??= {};

        parent.children[res.id] = res;
      }
    });

    return roots;
  }
}

export default new SpaceFactory();
