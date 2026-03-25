import type { Space } from "../space";
import { OPTS, type Component3D } from "./component-3d";
import type { ComponentInfo } from "./component-info";
import type { ComponentManager } from "../components";
import type { ComponentMixin } from "./component-mixin";
import { nanoid } from "../../internal/utils/nanoid";
import { ComponentPhysicsMixin } from "../mixins/physics";
import { Object3D } from "three";
import { DataSchemaConfig } from "../datamodel/data-wrapper";
import { upgradeData } from "../../internal/utils/js";
import { Component3DData } from "./component-3d-data";

export interface ComponentFactoryOptions {
    space: Space;
    container: ComponentManager;
    data: Component3DData;
    externalApi: unknown;
}

export interface AddOpts {
    abort?: AbortSignal;
    parent?: Object3D;
    persistent?: boolean;
}

export const NB_COMPONENT_PRIORITIES = 10;

export const COMPONENT_PRIORITY = {
    HIGH: 1,
    GROUPS: 2, // we load component groups after high priority
    MEDIUM: 5, // default
    AFTER_KIT: 10, // load after kitbash
    LOW: 20,
};

export class ComponentFactory<T extends Component3D> {
    //
    static info: ComponentInfo | null = null;

    static dataConfig: DataSchemaConfig = {};

    static getTitle(data: Component3DData) {
        return data.name || (data.type as string);
    }

    /** @deprecated Use setDataConfig instead */
    static createDataWrapper(opts: DataSchemaConfig) {
        //
        this.dataConfig = { ...opts };
    }

    static setDataConfig(opts: Partial<DataSchemaConfig>) {
        //
        this.dataConfig = {
            ...this.dataConfig,
            ...opts,
        };
    }

    static getDefaultData() {
        //
        return structuredClone(this.dataConfig.defaultData ?? {});
    }

    // global
    static async onPreload(): Promise<void> {
        return this.preload();
    }

    static async onShutdown() {
        return this.shutdown();
    }

    // Space specific
    constructor() {}

    public opts: ComponentFactoryOptions;

    public space: Space;

    public container: ComponentManager;

    public mixins: Array<ComponentMixin> = [];

    public get info(): ComponentInfo {
        //
        return this.constructor["info"];
    }

    async onInit(opts: ComponentFactoryOptions) {
        //
        this.opts = opts;

        this.space = opts.space;

        this.container = opts.container;

        this.mixins = [new ComponentPhysicsMixin(opts)];

        return this.init(this.opts);
    }

    get dataConfig(): DataSchemaConfig {
        //
        return this.constructor["dataConfig"];
    }

    async onResolve() {
        return this.resolve();
    }

    protected wasDisposed = false;

    onDispose() {
        if (this.wasDisposed) {
            return;
        }

        this.wasDisposed = true;

        return this.dispose();
    }

    onValidate(data: Component3DData) {
        return this.validate(data);
    }

    async onAddInstance(data: Component3DData, opts: AddOpts): Promise<T> {
        //

        data = this.upgradeData(data);

        data.id = data.id || `${data.type as string}-${nanoid()}`;

        this.validate(data);

        const instance = await this.addInstance(data, opts);

        await Promise.all(
            this.mixins.map((mixin) => {
                return mixin.init(instance);
            })
        );

        return instance;
    }

    onGetDefInstanceData(data: Component3DData): Component3DData {
        return (this.constructor as typeof ComponentFactory).getDefaultData();
    }

    upgradeData(data: Component3DData): Component3DData {
        //
        const defData = this.onGetDefInstanceData(data);

        data = upgradeData(data, defData);

        return data;
    }

    onRemoveInstance(component: T): void {
        this.mixins.forEach((mixin) => {
            mixin.dispose(component);
        });

        return this.removeInstance(component);
    }

    // Implementation specific

    static validateCreation(components: Record<string, Component3DData>): {
        success: boolean;
        message?: string;
    } {
        return { success: true, message: "" };
    }

    static async preload(): Promise<void> {}

    static async shutdown() {}

    protected async init(opts: ComponentFactoryOptions) {}

    protected async resolve() {}

    protected dispose() {}

    protected validate(data: Component3DData) {
        // ex: throw new Error("Invalid data")
    }

    async addInstance(data: Component3DData, opts: AddOpts): Promise<T> {
        //
        const instance = await this.createInstance(data);

        instance[OPTS].persistent = !!opts.persistent;

        opts.parent.add(instance);

        return instance;
    }

    removeInstance(component: Component3D) {
        //
        if (component.info.required) {
            //
            console.log("Can't remove required component " + component.data.id);
        }

        component?.parent?.remove(component);

        component._onDispose();
    }

    protected createInstance(data: Component3DData): Promise<T> {
        throw "abstract";
    }

    /**
     * @internal
     */
    static _patchMeta() {}

    /**
     * @internal
     */
    async _patch(opts: { instances: T[] }) {}
}
