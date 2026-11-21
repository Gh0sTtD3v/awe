import { AbstractCommand } from "./abstract-command";
import type { Component3D } from "@oncyberio/engine";
import { CommandContext } from "./types";
import { EngineFacade } from "../../../utils/engine-api";
import { shallowAssign } from "./utils";
import { Quaternion, Vector3 } from "three";
import { Draft } from "immer";
import { GameData } from "../../../types/game-data";

export interface UngroupOpts {
    groupId: string;
    autoSelect: boolean;
}

export class UngroupComponentsCommand extends AbstractCommand {
    //
    private _groupId: string;

    private _groupData: any;

    private _prevChildrenData: {
        id: string;
        parentId: string;
        transformData: any;
        position: Vector3;
        quaternion: Quaternion;
        scale: Vector3;
    }[];

    private _autoSelect: boolean;

    get groupId() {
        return this._groupId;
    }

    constructor(context: CommandContext, opts: UngroupOpts) {
        //
        super(context);

        this._autoSelect = opts.autoSelect;

        this._groupId = opts.groupId;

        this._savePrevData();
    }

    private _savePrevData() {
        //

        const group = this.getComponent(this._groupId);

        // A plain copy: the live data object goes away with the group.
        this._groupData = structuredClone(group.data);

        this._prevChildrenData = group.childComponents.map((component) => {
            //
            return {
                id: component.data.id,
                parentId: component.data.parentId,
                transformData: component.getTransformData(),
                position: component.position.clone(),
                quaternion: component.quaternion.clone(),
                scale: component.scale.clone(),
            };
        });
    }

    private async _removeGroup() {
        //
        const group = this.getComponent(this._groupId);

        const children = group.childComponents;

        EngineFacade.editor.commands.removeGroup(group);

        this.updateGameData((state) => {
            //
            delete state.components[this._groupId];

            this._updateChildrenData(state, children);
        });

        return children;
    }

    async doRun() {
        //
        const children = await this._removeGroup();

        if (this._autoSelect) {
            EngineFacade.editor.selection.setSelection(children);
        }
    }

    async undo() {
        //
        const group = await this.createComponent(this._groupData);

        this._prevChildrenData.forEach((childData) => {
            //
            const child = this.getComponent(childData.id);

            // Re-parent through the editor so parentId is recorded properly,
            // then put back the exact local transform it had in the group.
            EngineFacade.editor.commands.changeParent(child, group);

            child.position.copy(childData.position);
            child.quaternion.copy(childData.quaternion);
            child.scale.copy(childData.scale);

            child.syncWithTransform();
        });

        this.updateGameData((state) => {
            //
            state.components[this._groupData.id] = structuredClone(
                this._groupData
            );

            this._updateChildrenData(state, group.childComponents);
        });
    }

    async redo() {
        //
        await this._removeGroup();
    }

    private _updateChildrenData(
        draft: Draft<GameData>,
        children: Component3D[]
    ) {
        //
        children.forEach((child) => {
            //
            const childDraft = draft.components[child.data.id];

            const transform = child.getTransformData();

            shallowAssign(childDraft, transform);

            childDraft.parentId = child.data.parentId ?? null;
        });
    }
}
