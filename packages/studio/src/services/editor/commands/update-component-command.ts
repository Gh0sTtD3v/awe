import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";
import { Undo } from "../undo";
import { deepAssign } from "./utils";
import type { Component3D } from "@oncyberio/engine";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export interface UpdatePayload {
    run: () => Promise<Undo>;
    changes: any;
}

export interface UpdateComponentCommandOpts {
    id: string;
    command?: UpdatePayload;
    changes?: any;
}

export class UpdateComponentCommand extends AbstractCommand {
    private undoCmd: Undo;

    constructor(
        context: CommandContext,
        public opts: UpdateComponentCommandOpts
    ) {
        super(context);

        if (this.opts.command == null) {
            //
            if (this.opts.changes == null) {
                throw new Error("opts.changes is required");
            }

            this.opts.command = this.getUpdatePayload();
        }
    }

    private getUpdatePayload(): UpdatePayload {
        //
        const component = this.getComponent(this.opts.id);

        const preset = getOrCreateEditor(component)?.getPreset(this.opts.changes);

        return {
            changes: this.opts.changes,
            async run() {
                return preset.apply(true);
            },
        };
    }

    /** The instance the change was made on, and its values before the change. */
    private _instance: Component3D | null = null;

    private _previous: Record<string, any> | null = null;

    async doRun() {
        const component = this.getComponent(this.opts.id);
        this._instance = component;
        this._previous = this.snapshot(component, this.opts.command.changes);

        this.undoCmd = await this.opts.command.run();

        this.update();
    }

    async undo() {
        if (!(await this.reapplyIfRecreated(this._previous))) {
            await this.undoCmd.undo();
        }

        this.update();
    }

    async redo() {
        if (!(await this.reapplyIfRecreated(this.opts.command.changes))) {
            await this.undoCmd.redo();
        }

        this.update();
    }

    /** Current values of the keys a change touches, to put back on undo. */
    private snapshot(component: Component3D, changes: any): Record<string, any> | null {
        if (!changes || typeof changes !== "object") return null;
        const previous: Record<string, any> = {};
        for (const key of Object.keys(changes)) {
            const value = (component.data as any)[key];
            previous[key] = value === undefined ? undefined : structuredClone(value);
        }
        return previous;
    }

    /**
     * Undo / redo of other commands can recreate a component (ungroup, delete
     * then undo…), and the stored undo step points at the old, discarded
     * instance. Then apply the values to the current one instead. Returns
     * true when it did.
     */
    private async reapplyIfRecreated(values: Record<string, any> | null): Promise<boolean> {
        const component = this.getComponent(this.opts.id);
        if (component === this._instance || !values) return false;

        const preset = getOrCreateEditor(component)?.getPreset(values);
        if (!preset) return false;
        this.undoCmd = await preset.apply(true);
        this._instance = component;
        return true;
    }

    private update() {
        //
        const component = this.getComponent(this.opts.id);

        this.updateGameData((gameData) => {
            //
            this.updateComponentData(gameData, component);
        });
    }

    updateComponentData(gameData, component) {
        //
        const id = this.opts.id;

        const draft = gameData.components[this.opts.id];

        let hasChanged = deepAssign(draft, component.data, {
            delete: true,
            valuePaths: getOrCreateEditor(component)?._dataWrapper?._valuePaths ?? {},
        });

        if (hasChanged) {
            gameData.components[id]._version = Date.now();
        }
    }
}
