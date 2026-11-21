import { BoxGeometry, Intersection, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { Component3DEditor } from "../../component-editor/ui-editor";
import { MusicZoneComponent } from "@oncyberio/engine/space/components/music-zone/music-zone-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import Scene from "@oncyberio/engine/internal/scene";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

const urlFormat = {
	format: (url: string) => (url ? { path: url } : null),
	parse: (val: any) => val?.path ?? "",
};

type Axis = "x" | "y" | "z";

/** One handle per side: the axis it moves along and which side (+1 / -1). */
const SIDES: Array<{ axis: Axis; sign: 1 | -1 }> = [
	{ axis: "x", sign: 1 },
	{ axis: "x", sign: -1 },
	{ axis: "y", sign: 1 },
	{ axis: "y", sign: -1 },
	{ axis: "z", sign: 1 },
	{ axis: "z", sign: -1 },
];

/** Smallest size a side drag can make, in metres. */
const MIN_SIZE = 0.2;

const IDLE_COLOR = 0xffffff;
const HOVER_COLOR = 0xffd23f;
const ACTIVE_COLOR = 0x3fdc8a;

function unit(axis: Axis, sign: number): Vector3 {
	return new Vector3(axis === "x" ? sign : 0, axis === "y" ? sign : 0, axis === "z" ? sign : 0);
}

/**
 * Studio panel for music zones, plus side handles: while the zone is
 * selected, the middle of each of its six sides shows a small cube. Click one
 * and drag it with the move arrows. For a box, that side moves and the
 * opposite side stays put; for a sphere, the radius changes and the centre
 * stays put.
 */
/** @internal */
export class MusicZoneComponentEditor extends Component3DEditor<MusicZoneComponent> {

	private _handles: Mesh[] = [];
	private _active: Mesh | null = null;
	private _hovered: Mesh | null = null;
	/** While a side is dragged: the fixed point (opposite side, or the sphere's centre) and the zone's rotation. */
	private _drag: { anchor: Vector3; rotation: Quaternion } | null = null;

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				music: {
					type: "folder",
					label: "Music",
					children: {
						url: {
							type: "file",
							label: "Music file",
							value: [this.data, "url"],
							accept: ".mp3,.ogg,.wav,.m4a",
							acceptLabel: ".mp3, .ogg, .wav, .m4a",
							prompt: "Upload music",
							action: "upload",
							format: urlFormat,
						},
						volume: {
							type: "number",
							label: "Volume (0 to 1)",
							value: [this.data, "volume"],
							min: 0,
							max: 1,
							step: 0.05,
						},
						fadeDistance: {
							type: "number",
							label: "Fade distance (m, 0 = off)",
							value: [this.data, "fadeDistance"],
							min: 0,
							max: 200,
							step: 0.5,
						},
						shape: {
							type: "select",
							label: "Shape",
							value: [this.data, "shape"],
							items: [
								{ id: "box", label: "Box (rectangle)" },
								{ id: "sphere", label: "Sphere" },
							],
						},
						loop: {
							type: "checkbox",
							label: "Loop",
							value: [this.data, "loop"],
						},
						restartOnEnter: {
							type: "checkbox",
							label: "Restart when you come back",
							value: [this.data, "restartOnEnter"],
						},
					},
				},
			},
		};
	}

	// --- Side handles ---

	getDetailMeshes(): Mesh[] {
		return this._handles.length ? this._handles : null;
	}

	onSelectedChanged(isSelected: boolean) {
		if (isSelected) this._showHandles();
		else this._hideHandles();
	}

	onDetailMeshClicked(mesh: Mesh, _intersect: Intersection<Mesh>) {
		if (!this._handles.includes(mesh)) return;
		this._setActive(mesh);
		this.attachTransfomControls(mesh, {
			translate: true,
			callbacks: {
				onDragStart: this._onDragStart,
				onDrag: this._onDrag,
				onDragEnd: this._onDragEnd,
			},
		});
	}

	onDetailMeshMouseEnter(mesh: Mesh) {
		this._hovered = mesh;
		this._paint();
	}

	onDetailMeshMouseLeave(mesh: Mesh) {
		if (this._hovered === mesh) this._hovered = null;
		this._paint();
	}

	private _showHandles() {
		if (this._handles.length) return;
		const geometry = new BoxGeometry(0.35, 0.35, 0.35);
		SIDES.forEach((side, i) => {
			const handle = new Mesh(geometry, new MeshBasicMaterial({ color: IDLE_COLOR, depthTest: false }));
			handle.renderOrder = 999;
			handle.userData.side = i;
			// Drawn on top, so clicks on it win over the zone's volume in front of it.
			handle.userData.pickFirst = true;
			this._handles.push(handle);
			Scene.add(handle);
		});
		this._layoutHandles();
		emitter.on(EngineEvents.UPDATE, this._layoutHandles);
		this.component.on("data", this._layoutHandles);
	}

	private _hideHandles() {
		if (!this._handles.length) return;
		emitter.off(EngineEvents.UPDATE, this._layoutHandles);
		this.component.off("data", this._layoutHandles);
		if (this._active) this.detachTransformControls(this._active);
		for (const handle of this._handles) {
			handle.removeFromParent();
			(handle.material as MeshBasicMaterial).dispose();
		}
		this._handles[0]?.geometry.dispose();
		this._handles = [];
		this._active = null;
		this._hovered = null;
		this._drag = null;
	}

	/** World position of the middle of a side (for a sphere: its surface along that axis). */
	private _sidePoint(index: number, out: Vector3): Vector3 {
		const zone = this.component;
		const { axis, sign } = SIDES[index];
		zone.updateMatrixWorld(true);
		if (zone.isSphere) {
			const radius = Math.abs(zone.scale.x) / 2;
			const q = zone.getWorldQuaternion(new Quaternion());
			return out.copy(unit(axis, sign).multiplyScalar(radius).applyQuaternion(q)).add(zone.getWorldPosition(new Vector3()));
		}
		return zone.localToWorld(out.copy(unit(axis, sign).multiplyScalar(0.5)));
	}

	/** Put the handles on the sides; the one being dragged stays under the mouse. */
	private _layoutHandles = () => {
		if (!this.component || !this._handles.length) return;
		for (const handle of this._handles) {
			if (this._drag && handle === this._active) continue;
			this._sidePoint(handle.userData.side, handle.position);
		}
	};

	private _setActive(mesh: Mesh | null) {
		if (this._active && this._active !== mesh) this.detachTransformControls(this._active);
		this._active = mesh;
		this._paint();
	}

	private _paint() {
		for (const handle of this._handles) {
			const color = handle === this._active ? ACTIVE_COLOR : handle === this._hovered ? HOVER_COLOR : IDLE_COLOR;
			(handle.material as MeshBasicMaterial).color.set(color);
		}
	}

	private _onDragStart = () => {
		if (!this._active) return;
		const zone = this.component;
		zone.updateMatrixWorld(true);
		const rotation = zone.getWorldQuaternion(new Quaternion());
		const index = this._active.userData.side;
		const opposite = index ^ 1; // sides come in +/- pairs
		const anchor = zone.isSphere ? zone.getWorldPosition(new Vector3()) : this._sidePoint(opposite, new Vector3());
		this._drag = { anchor, rotation };
	};

	/** The new centre and size from where the dragged handle is now. */
	private _shape(): { center: Vector3; axis: Axis; size: number; sphere: boolean } | null {
		if (!this._drag || !this._active) return null;
		const { anchor, rotation } = this._drag;
		const { axis, sign } = SIDES[this._active.userData.side];
		const dir = unit(axis, sign).applyQuaternion(rotation);
		// Only movement along the side's own direction counts; keep the handle on that line.
		const along = this._active.position.clone().sub(anchor).dot(dir);

		if (this.component.isSphere) {
			const radius = Math.max(MIN_SIZE / 2, along);
			this._active.position.copy(dir).multiplyScalar(radius).add(anchor);
			return { center: anchor.clone(), axis, size: radius * 2, sphere: true };
		}
		const size = Math.max(MIN_SIZE, along);
		this._active.position.copy(dir).multiplyScalar(size).add(anchor);
		return { center: dir.clone().multiplyScalar(size / 2).add(anchor), axis, size, sphere: false };
	}

	/** Live preview while dragging. */
	private _onDrag = () => {
		const shape = this._shape();
		if (!shape) return;
		const zone = this.component;
		zone.position.copy(zone.parent ? zone.parent.worldToLocal(shape.center.clone()) : shape.center);
		if (shape.sphere) zone.scale.set(shape.size, shape.size, shape.size);
		else zone.scale[shape.axis] = shape.size;
		this._layoutHandles();
	};

	/** Save the new size so it can be undone and is stored with the world. */
	private _onDragEnd = () => {
		const shape = this._shape();
		this._drag = null;
		if (!shape) return;
		const zone = this.component;
		const local = zone.parent ? zone.parent.worldToLocal(shape.center.clone()) : shape.center;
		const scale = { ...(this.data.scale ?? { x: 1, y: 1, z: 1 }) };
		if (shape.sphere) {
			scale.x = scale.y = scale.z = shape.size;
		} else {
			scale[shape.axis] = shape.size;
		}
		this.dispatchDataChange({
			position: { x: local.x, y: local.y, z: local.z },
			scale,
		});
		this._layoutHandles();
	};

	dispose() {
		this._hideHandles();
	}
}
