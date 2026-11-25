import { GameTreeNode } from "../../../types/game-data";
import { AbstractCommand } from "./abstract-command";
import { CommandContext } from "./types";

export interface DeleteComponentsCommandOpts {
    ids: string[];
}

export class DeleteComponentsCommand extends AbstractCommand {
    //
    private _ids: string[];

    private _savedNodes: GameTreeNode[] = [];

    constructor(context: CommandContext, { ids }: DeleteComponentsCommandOpts) {
        //
        super(context);

        // Drop components whose parent (or grandparent…) is deleted too: they go
        // with it, and saving / restoring them on their own would delete them
        // twice and recreate them before their parent on undo.
        const all = new Set(ids);
        const hasDeletedAncestor = (id: string) => {
            let parentId = this.gameData.components[id]?.parentId;
            const seen = new Set<string>();
            while (parentId && !seen.has(parentId)) {
                if (all.has(parentId)) return true;
                seen.add(parentId);
                parentId = this.gameData.components[parentId]?.parentId;
            }
            return false;
        };
        this._ids = [...all].filter((id) => !hasDeletedAncestor(id));

        this._savedNodes = this._ids.map((id) => {
            //
            return this.treeModel.getNode(id);
        });
    }

    async doRun() {
        //
        await this._run3D();

        await this._runDB();
    }

    async _run3D() {
        //
        //
        // this will delete the component as well as its children in 3D.
        // Some may have nothing loaded (a model whose file is missing): the
        // data is still removed below.
        for (const id of this._ids) {
            //
            let instance = null;
            try {
                instance = this.getComponent(id);
            } catch {
                instance = null;
            }

            instance?.destroy();
        }
    }

    async _runDB() {
        //
        // update game data
        this.updateGameData((draft) => {
            //
            this.treeModel.deleteNodes(this._savedNodes, draft);
        });
    }

    async undo() {
        //
        await this._undo3D();

        await this._undoDB();
    }

    async _undo3D() {
        //
        // A component that can't be created (missing file) still comes back
        // in the data below, as it was before the delete.
        await Promise.all(
            //
            this._savedNodes.map((node) =>
                Promise.resolve()
                    .then(() => this.createComponent(node))
                    .catch((err) => console.error("Could not recreate component", node?.data?.id ?? node, err))
            )
        );
    }

    async _undoDB() {
        //
        // update game data
        this.updateGameData((draft) => {
            //
            this.treeModel.saveNodes(this._savedNodes, draft);
        });
    }

    async redo() {
        //
        await this._redo3D();

        await this._redoDB();
    }

    async _redo3D() {
        //
        await this._run3D();
    }

    async _redoDB() {
        //
        await this._runDB();
    }
}
