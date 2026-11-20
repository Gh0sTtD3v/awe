import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from "three";
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { GravityZoneComponentData } from "./gravity-zone-data";
import { IS_EDIT_MODE } from "../../../internal/constants";

export type { GravityZoneComponentData } from "./gravity-zone-data";

const UP_COLOR = new Color("#3fd0ff");
const DOWN_COLOR = new Color("#ff5a5a");

let _box: BoxGeometry | null = null;
let _edges: EdgesGeometry | null = null;

/** A unit cube standing on the origin: x and z in [-0.5, 0.5], y in [0, 1]. */
function getBox(): BoxGeometry {
	if (!_box) {
		_box = new BoxGeometry(1, 1, 1);
		_box.translate(0, 0.5, 0);
	}
	return _box;
}

function getEdges(): EdgesGeometry {
	if (!_edges) _edges = new EdgesGeometry(getBox());
	return _edges;
}

/**
 * @public
 *
 * Reverse gravity: a box-shaped zone (a floor square extruded `height` metres
 * up) that carries players up or down at `strength` metres per second. Use it
 * for elevators and jump pads.
 *
 * The component only marks the zone. Moving players is the host game's job.
 *
 * Visible as a translucent box in the studio (blue lifts, red pushes down),
 * invisible during play.
 */
export class GravityZoneComponent extends Component3D<GravityZoneComponentData> {

	private _volume: Mesh = null;
	private _material: MeshBasicMaterial = null;
	private _lines: LineSegments = null;

	/** @internal */
	protected async init() {
		const volume = this.getCollisionMesh();
		volume.visible = IS_EDIT_MODE;
		this._updateLook();
	}

	/** @internal */
	onDataChange(_opts: DataChangeOpts<GravityZoneComponentData>) {
		this._updateLook();
	}

	/** @internal */
	getCollisionMesh() {
		if (this._volume == null) {
			this._material = new MeshBasicMaterial({
				color: UP_COLOR.clone(),
				transparent: true,
				opacity: 0.12,
				depthWrite: false,
			});
			this._volume = new Mesh(getBox(), this._material);
			this._lines = new LineSegments(
				getEdges(),
				new LineBasicMaterial({ color: UP_COLOR.clone(), transparent: true, opacity: 0.8 }),
			);
			this._volume.add(this._lines);
			this._volume.visible = false;
			this.add(this._volume);
		}
		return this._volume;
	}

	/** The zone's height in metres (never below 0.1). */
	get height(): number {
		const h = Number(this.data.height);
		return Number.isFinite(h) && h > 0.1 ? h : 0.1;
	}

	/** Stretch the box to `height` (undoing any y scale) and colour it by direction. */
	private _updateLook() {
		if (!this._volume) return;
		const sy = Math.abs(this.scale.y) > 1e-6 ? this.scale.y : 1;
		this._volume.scale.set(1, this.height / sy, 1);
		const color = Number(this.data.strength) < 0 ? DOWN_COLOR : UP_COLOR;
		this._material.color.copy(color);
		(this._lines.material as LineBasicMaterial).color.copy(color);
	}

	/** @internal */
	protected dispose() {
		this._volume?.removeFromParent();
		this._material?.dispose();
		(this._lines?.material as LineBasicMaterial)?.dispose();
		this._volume = null;
		this._lines = null;
		this._material = null;
	}
}
