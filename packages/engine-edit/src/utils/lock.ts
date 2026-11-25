import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

/**
 * Locks in the studio.
 *
 * A component is locked when its `lock` data has any flag set (the studio's
 * Lock button sets `{ position: true, rotation: true, lockedBy }`). A locked
 * component, and everything inside a locked group, can still be seen but not
 * hovered, clicked, moved, edited, grouped, deleted or replaced from the
 * viewport or the edit panel: the only thing left to do with it is unlock it.
 */

/** True when this component's own data is locked (ignores its groups). */
export function hasOwnLock(data: any): boolean {
    const lock = data?.lock;

    if (lock == null || typeof lock !== "object") return false;

    return Object.values(lock).some((value) => value === true);
}

/** True when the component, or any group it sits in, is locked. */
export function isComponentLocked(component: Component3D | null | undefined): boolean {
    let current: Component3D | null | undefined = component;

    while (current) {
        if (hasOwnLock(current.data)) return true;

        current = current.parentComponent;
    }

    return false;
}
