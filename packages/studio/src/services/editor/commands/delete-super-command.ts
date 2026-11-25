import type { Component3D } from "@oncyberio/engine";
import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { DeleteComponentsCommand } from "./delete-components";
import { UngroupComponentsCommand } from "./ungroup-components";

export interface DeleteSuperCommandOpts {
  ids: string[];
}

/**
 * Deletes components. Deleting a group keeps what is inside it: the group is
 * dissolved (its children move up to the group's parent and stay where they
 * are in the world) and only the group itself goes. Children that are
 * selected too are deleted along with the rest.
 *
 * Undo puts everything back in reverse order: the deleted components first,
 * then each group around its children again.
 */
export class DeleteSuperCommand extends AbstractCommand {
  //
  private _ids: string[];

  /** Groups (with children) to dissolve, outermost first. */
  private _groupIds: string[];

  /** The dissolve steps actually run, in order (built when run). */
  private _ungroups: UngroupComponentsCommand[] = [];

  /** Deletes the rest; built when run, once groups are dissolved, so it records the final parents. */
  private _delete: DeleteComponentsCommand | null = null;

  constructor(context: CommandContext, { ids }: DeleteSuperCommandOpts) {
    //
    super(context);

    // Keep ids that exist in the world data even when nothing is loaded for
    // them (e.g. a model whose file is gone): they must stay deletable.
    this._ids = [...new Set(ids)].filter((id) => this._find(id) != null || this._inData(id));

    this._groupIds = this._ids
      .filter((id) => {
        const component = this._find(id);
        return component != null && component.data.type === "group" && component.childComponents.length > 0;
      })
      .sort((a, b) => this._depth(this._find(a)) - this._depth(this._find(b)));
  }

  private _find(id: string): Component3D | null {
    try {
      return this.getComponent(id);
    } catch {
      return null;
    }
  }

  private _inData(id: string): boolean {
    return this.gameData.components[id] != null;
  }

  private _depth(component: Component3D): number {
    let depth = 0;
    let current = component?.parentComponent;
    while (current) {
      depth++;
      current = current.parentComponent;
    }
    return depth;
  }

  async doRun() {
    //
    // 1. Dissolve groups, outermost first. Each step is set up only when it
    //    runs, so an inner group records its parent after the outer one is gone.
    this._ungroups = [];
    for (const groupId of this._groupIds) {
      const group = this._find(groupId);
      if (!group || group.childComponents.length === 0) continue;
      const ungroup = new UngroupComponentsCommand(this.context, { groupId, autoSelect: false });
      await ungroup.doRun();
      this._ungroups.push(ungroup);
    }

    // 2. Delete everything else that was asked for (dissolved groups are already gone).
    const dissolved = new Set(this._ungroups.map((u) => u.groupId));
    const rest = this._ids.filter((id) => !dissolved.has(id) && (this._find(id) != null || this._inData(id)));

    this._delete = rest.length > 0 ? new DeleteComponentsCommand(this.context, { ids: rest }) : null;
    await this._delete?._run3D();
    await this._delete?._runDB();
  }

  async undo() {
    //
    await this._delete?._undo3D();
    await this._delete?._undoDB();

    for (const ungroup of [...this._ungroups].reverse()) {
      await ungroup.undo();
    }
  }

  async redo() {
    //
    for (const ungroup of this._ungroups) {
      await ungroup.redo();
    }

    await this._delete?._redo3D();
    await this._delete?._redoDB();
  }
}
