import {
	BoxGeometry,
	BufferGeometry,
	Color,
	EdgesGeometry,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	SphereGeometry,
	WireframeGeometry,
} from "three";
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { MusicZoneComponentData } from "./music-zone-data";
import { IS_EDIT_MODE } from "../../../internal/constants";

export type { MusicZoneComponentData } from "./music-zone-data";

const COLOR = new Color("#3fdc8a");

let _box: BoxGeometry | null = null;
let _boxEdges: EdgesGeometry | null = null;
let _sphere: SphereGeometry | null = null;
let _sphereLines: BufferGeometry | null = null;

const box = () => (_box ??= new BoxGeometry(1, 1, 1));
const boxEdges = () => (_boxEdges ??= new EdgesGeometry(box()));
const sphere = () => (_sphere ??= new SphereGeometry(0.5, 32, 16));
const sphereLines = () => (_sphereLines ??= new WireframeGeometry(new SphereGeometry(0.5, 16, 8)));

/**
 * @public
 *
 * Music that plays while players are in an area: a box (a rectangle whose
 * sides can each be moved) or a sphere. Inside, the music plays at full
 * volume; an optional fade band around it brings the volume up as players
 * approach and down as they walk away.
 *
 * The component only marks the zone. Playing the music is the host game's job.
 *
 * Visible in the studio (a green volume, with a dashed outline for the fade
 * band), invisible during play.
 */
export class MusicZoneComponent extends Component3D<MusicZoneComponentData> {

	private _volume: Mesh = null;
	private _edges: LineSegments = null;
	private _fade: LineSegments = null;

	/** @internal */
	protected async init() {
		this.getCollisionMesh().visible = IS_EDIT_MODE;
		this._updateLook();
	}

	/** @internal */
	onDataChange(_opts: DataChangeOpts<MusicZoneComponentData>) {
		this._updateLook();
	}

	get isSphere(): boolean {
		return this.data.shape === "sphere";
	}

	/** Fade band width in metres (0 when off). */
	get fadeDistance(): number {
		const f = Number(this.data.fadeDistance);
		return Number.isFinite(f) && f > 0 ? f : 0;
	}

	/** @internal */
	getCollisionMesh() {
		if (this._volume == null) {
			this._volume = new Mesh(
				box(),
				new MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0.1, depthWrite: false }),
			);
			this._edges = new LineSegments(
				boxEdges(),
				new LineBasicMaterial({ color: COLOR, transparent: true, opacity: 0.9 }),
			);
			this._fade = new LineSegments(
				boxEdges(),
				new LineBasicMaterial({ color: COLOR, transparent: true, opacity: 0.35 }),
			);
			// The outlines are children of the component, not of the volume, so
			// selecting clicks only hit the volume itself.
			this._volume.visible = false;
			this.add(this._volume);
			this.add(this._edges);
			this.add(this._fade);
		}
		return this._volume;
	}

	/** Shape, size and fade outline. A sphere stays round whatever the scale. */
	private _updateLook() {
		if (!this._volume) return;
		const sphereMode = this.isSphere;
		const s = this.scale;
		const sx = Math.abs(s.x) || 1;
		const sy = Math.abs(s.y) || 1;
		const sz = Math.abs(s.z) || 1;
		const f = this.fadeDistance;

		this._volume.geometry = sphereMode ? sphere() : box();
		this._edges.geometry = sphereMode ? sphereLines() : boxEdges();
		this._fade.geometry = sphereMode ? sphereLines() : boxEdges();

		if (sphereMode) {
			const d = sx; // diameter
			this._volume.scale.set(d / sx, d / sy, d / sz);
			this._edges.scale.copy(this._volume.scale);
			this._fade.scale.set((d + 2 * f) / sx, (d + 2 * f) / sy, (d + 2 * f) / sz);
		} else {
			this._volume.scale.set(1, 1, 1);
			this._edges.scale.set(1, 1, 1);
			this._fade.scale.set((sx + 2 * f) / sx, (sy + 2 * f) / sy, (sz + 2 * f) / sz);
		}

		const visible = IS_EDIT_MODE;
		this._volume.visible = visible;
		this._edges.visible = visible;
		this._fade.visible = visible && f > 0;
	}

	/** @internal */
	protected dispose() {
		for (const part of [this._volume, this._edges, this._fade]) {
			part?.removeFromParent();
			(part?.material as MeshBasicMaterial | LineBasicMaterial)?.dispose();
		}
		this._volume = null;
		this._edges = null;
		this._fade = null;
	}
}
