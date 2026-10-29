import type { Component3DEditor } from "../ui-editor";
import type { GuiObjectLens } from "@oncyberio/engine/space/gui-types";

/**
 * A lens on one field of one item in an array property, e.g.
 * `playlist[2].url`, for `itemGui` controls of an `array` descriptor.
 *
 * Component data treats arrays as single values (a path like
 * `playlist.2.url` can't be set), so this reads the field from the array and
 * writes back a whole new array through the normal data lens — the same
 * route top-level fields take, so the change is saved, undoable and reaches
 * the component.
 */
export function arrayItemLens(
	editor: Component3DEditor<any>,
	key: string,
	index: number,
	field: string,
	fallback: any = "",
): GuiObjectLens<any> & { readonly source: unknown; readonly prop: string } {
	const list = editor.getLens([editor.data, key]);

	return {
		get: () => list.get()?.[index]?.[field] ?? fallback,
		set: (value: any, opts?: { isProgress: boolean }) => {
			const items = Array.isArray(list.get()) ? [...list.get()] : [];
			items[index] = { ...(items[index] ?? {}), [field]: value };
			return list.set(items, opts);
		},
		get source() {
			return list.source;
		},
		get prop() {
			return `${key}.${index}.${field}`;
		},
	};
}
