import type { ComponentFactory } from "@oncyberio/engine";
import { EngineFacade } from "../utils/engine-api";

type ComponentFactoryClass = typeof ComponentFactory<any>;

export function useComponentList() {
    const options: ComponentFactoryClass[] =
        EngineFacade.editor.componentsRegistry.getComponentTypes();

    return options;
}
