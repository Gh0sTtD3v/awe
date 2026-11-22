import { BoxGeometry, Intersection, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { Component3DEditor } from "../../component-editor/ui-editor";
import { GravityZoneComponent } from "@oncyberio/engine/space/components/gravity-zone/gravity-zone-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import Scene from "@oncyberio/engine/internal/scene";
import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

/** Corners of the floor square, in the zone's local (unit) space. */
const CORNERS: Array<[number, number]> = [
	[-0.5, -0.5],
	[0.5, -0.5],
	[0.5, 0.5],
	[-0.5, 0.5],
];

/** Smallest width / depth a corner drag can make, in metres. */
const MIN_SIZE = 0.2;

const IDLE_COLOR = 0xffffff;
const HOVER_COLOR = 0xffd23f;
const ACTIVE_COLOR = 0x3fdc8a;

const _v = new Vector3();
const _q = new Quaternion();
const _qInv = new Quaternion();

/**
 * Studio panel for reverse gravity zones, plus corner handles: while the zone
 * is selected its four floor corners show as small cubes. Click one and drag
 * it with the move arrows; the opposite corner stays put and the floor
 * resizes between them.
 */
/** @internal */
export class GravityZoneComponentEditor extends Component3DEditor<GravityZoneComponent> {

	private _handles: Mesh[] = [];
	private _active: Mesh | null = null;
	private _hovered: Mesh | null = null;
	/** Set while a corner is being dragged: the corner that stays put, and the zone's rotation. */
	private _drag: { anchor: Vector3; rotation: Quaternion; baseY: number } | null = null;

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				gravity: {
					type: "folder",
					label: "Reverse Gravity",
					children: {
						height: {
							type: "number",
							label: "Height (m)",
							value: [this.data, "height"],
							min: 0.1,
							max: 500,
							step: 0.1,
						},
						strength: {
							type: "number",
							label: "Strength (m/s, - = slow fall)",
							value: [this.data, "strength"],
							min: -50,
							max: 50,
							step: 0.1,
						},
					},
				},
			},
		};
	}

	// --- Corner handles ---

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
		const geometry = new BoxGeometry(0.3, 0.3, 0.3);
		for (let i = 0; i < CORNERS.length; i++) {
			const handle = new Mesh(geometry, new MeshBasicMaterial({ color: IDLE_COLOR, depthTest: false }));
			handle.renderOrder = 999;
			handle.userData.corner = i;
			// Drawn on top, so clicks on it win over the zone's box in front of it.
			handle.userData.pickFirst = true;
			this._handles.push(handle);
			Scene.add(handle);
		}
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

	/** Put the handles on the floor corners; the one being dragged stays under the mouse. */
	private _layoutHandles = () => {
		const zone = this.component;
		if (!zone || !this._handles.length) return;
		zone.updateMatrixWorld(true);
		for (const handle of this._handles) {
			if (this._drag && handle === this._active) continue;
			const [x, z] = CORNERS[handle.userData.corner];
			zone.localToWorld(handle.position.set(x, 0, z));
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
		const [x, z] = CORNERS[this._active.userData.corner];
		const anchor = zone.localToWorld(new Vector3(-x, 0, -z));
		this._drag = { anchor, rotation: zone.getWorldQuaternion(new Quaternion()), baseY: anchor.y };
	};

	/** The floor between the dragged corner and the fixed one: its centre and size. */
	private _rect(): { center: Vector3; width: number; depth: number } | null {
		if (!this._drag || !this._active) return null;
		const { anchor, rotation, baseY } = this._drag;
		// Corners stay on the floor: ignore vertical moves of the handle.
		this._active.position.y = baseY;
		_qInv.copy(rotation).invert();
		const local = _v.copy(this._active.position).sub(anchor).applyQuaternion(_qInv);
		const width = Math.max(MIN_SIZE, Math.abs(local.x));
		const depth = Math.max(MIN_SIZE, Math.abs(local.z));
		const half = new Vector3((Math.sign(local.x) || 1) * width / 2, 0, (Math.sign(local.z) || 1) * depth / 2);
		const center = half.applyQuaternion(_q.copy(rotation)).add(anchor);
		return { center, width, depth };
	}

	/** Live preview while dragging: move and stretch the zone itself. */
	private _onDrag = () => {
		const rect = this._rect();
		if (!rect) return;
		const zone = this.component;
		const parent = zone.parent;
		const local = parent ? parent.worldToLocal(rect.center.clone()) : rect.center;
		zone.position.copy(local);
		zone.scale.x = rect.width;
		zone.scale.z = rect.depth;
		this._layoutHandles();
	};

	/** Save the new floor so it can be undone and is stored with the world. */
	private _onDragEnd = () => {
		const rect = this._rect();
		this._drag = null;
		if (!rect) return;
		const zone = this.component;
		const local = zone.parent ? zone.parent.worldToLocal(rect.center.clone()) : rect.center;
		this.dispatchDataChange({
			position: { x: local.x, y: local.y, z: local.z },
			scale: { x: rect.width, y: this.data.scale?.y ?? 1, z: rect.depth },
		});
		this._layoutHandles();
	};

	dispose() {
		this._hideHandles();
	}
}
