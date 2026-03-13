import { Draft } from "immer";
import { GameDataStore } from "./game-data-store";
import { GameData, GameTreeNode, GameViewNode } from "../../types/game-data";

//

const relations = {
  //
  isChild(child: GameTreeNode, parent: GameTreeNode) {
    //
    return child.parentId === parent.id;
  },
};

export class GameTreeModel {
  //

  constructor(private store: GameDataStore) {}

  private get gameData() {
    return this.store.gameData;
  }

  private _rootsCache = new WeakMap<GameData, GameTreeNode[]>();

  getRoots(): GameViewNode[] {
    //
    const cached = this._rootsCache.get(this.gameData);

    if (cached) {
      return cached;
    }

    const roots: GameViewNode[] = [];

    const map: Record<string, GameTreeNode> = {};

    const components = this.gameData.components;

    Object.keys(components).forEach((id) => {
      //
      const component = components[id];

      if (component.type !== "script") {
        map[id] = {
          ...component,
          children: {},
          parent: null,
          root: null,
        };
      }
    });

    // Build hierarchy
    Object.keys(map).forEach((id) => {
      //

      const node = map[id];

      if (node.parentId) {
        //
        const parent = map[node.parentId];

        if (parent == null) {
          //
          console.error(`Parent with id ${node.parentId} not found`);

          return;
        }

        parent.children[node.id] = node;

        node.parent = parent;
        //
      }

      if (!node.parentId) {
        //
        roots.push(node);
      }
    });

    this._resolveRoots(map);

    this._rootsCache.set(this.gameData, roots);

    return roots;
  }

  private _getComponent(id: string) {
    const component = this.gameData.components[id];

    if (!component) {
      //
      throw new Error(`Component with id ${id} not found`);
    }

    return component;
  }

  /**
   * get the whole data tree of a component
   */
  getNode(id: string): GameTreeNode {
    //
    const nodeData = this._getComponent(id);

    const node = { ...nodeData };

    node.children = this._getRelatedNodes(node, relations.isChild);

    return node;
  }

  private _getRelatedNodes(
    node: GameTreeNode,
    fn: (main: GameTreeNode, other: GameTreeNode) => boolean
  ) {
    //
    const result: Record<string, GameTreeNode> = {};

    Object.values(this.gameData.components).forEach((c) => {
      //
      if (fn(c, node)) {
        //
        result[c.id] = this.getNode(c.id);
      }
    });

    return result;
  }

  /**
   * get the child data trees of a component
   */
  getChildren(id: string) {
    //
    const node = this._getComponent(id);

    return this._getRelatedNodes(node, relations.isChild);
  }

  saveNodes(nodes: GameTreeNode[], draft: Draft<GameData>) {
    //
    for (const node of nodes) {
      //
      this.saveNode(node, draft);
    }
  }

  saveNode(node: GameTreeNode, draft: Draft<GameData>) {
    //
    const { children, ...data } = node;

    draft.components[data.id] = data;

    this.saveNodes(Object.values(children || {}), draft);
  }

  setNodeData(data: GameTreeNode, draft: Draft<GameData>) {
    //
    draft.components[data.id] = data;
  }

  deleteNodeId(id: string, draft: Draft<GameData>) {
    //
    const node = this.getNode(id);

    this.deleteNode(node, draft);
  }

  deleteNode(node: GameTreeNode, draft: Draft<GameData>) {
    //
    const { children } = node;

    delete draft.components[node.id];

    this.deleteNodes(Object.values(children), draft);
  }

  deleteNodes(node: GameTreeNode[], draft: Draft<GameData>) {
    //
    for (const n of node) {
      //
      this.deleteNode(n, draft);
    }
  }

  isDescendentOf(node: GameTreeNode, parentIds: string | string[]) {
    const ids = Array.isArray(parentIds) ? parentIds : [parentIds];

    if (ids.includes(node.parentId)) {
      return true;
    }

    if (!node.parentId) {
      return false;
    }

    const parent = this.gameData.components[node.parentId];

    return this.isDescendentOf(parent, ids);
  }

  private _resolveRoots(map: Record<string, GameTreeNode>) {
    //
    // set root field
    Object.values(map).forEach((node) => {
      //
      if (node.parentId) {
        //
        // find the root
        let root = node;

        while (root.parent) {
          //
          root = root.parent;
        }

        node.root = root;
      }
    });
  }
}
