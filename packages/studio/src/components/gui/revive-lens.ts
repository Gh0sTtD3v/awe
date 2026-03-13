import { Space } from "@oncyberio/engine";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export function reviveLens(space: Space, lens) {
    //
    if (lens.componentId == null) {
        //
        return lens;
    }

    const component = space.components.byInternalId(lens.componentId);

    if (component == null) {
        //
        throw new Error("Component not found " + lens.componentId);
    }

    return getOrCreateEditor(component)?.reviveLens(lens);
}
