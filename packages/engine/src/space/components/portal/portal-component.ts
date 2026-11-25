import {
	CylinderGeometry,
	Group,
	Mesh,
	MeshBasicMaterial,
} from "three";
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { PortalComponentData } from "./portal-data";
import { IS_EDIT_MODE } from "../../../internal/constants";
import emitter from "../../../internal/engine-emitter";
import { GameEvents } from "../../../internal/game-events";
import { SpawnSelectionMesh } from "./spawn-halo-mesh";

export type { PortalComponentData } from "./portal-data";

/** Height of the glowing halo wall, in metres (a bit above head height). */
const HALO_HEIGHT = 2.2;

let _collisionMaterial: MeshBasicMaterial | null = null;

function getCollisionMaterial(): MeshBasicMaterial {
	if (!_collisionMaterial) {
		_collisionMaterial = new MeshBasicMaterial({ visible: false });
	}
	return _collisionMaterial;
}

/**
 * @public
 *
 * A portal is a spawn point and a destination. Players spawn on a plot's
 * portal and arrive on one when travelling. Entering one (sensor enter) opens
 * the destination directory ("yellowpages") via the `PORTAL_OPEN` event,
 * letting the player travel to any other portal — a one-to-many relationship
 * rather than a hard-wired one-to-one link.
 *
 * Shown as the green spawn halo in the studio only; invisible in play.
 */
export class PortalComponent extends Component3D<PortalComponentData> {

	private _halo: Group | null = null;
	private _collision: Mesh = null;
	private _lastTrigger = 0;

	/** @internal */
	protected async init() {
		this._buildHalo();
	}

	/** @internal */
	async _onReady() {
		if (IS_EDIT_MODE) return;

		this.onSensorEnter((event) => {
			this._open(event.other);
		});
	}

	/** The halo is an editor marker, like the old spawnpoint: never drawn in play. */
	private _buildHalo() {
		this._disposeHalo();
		if (!IS_EDIT_MODE) return;
		this._halo = SpawnSelectionMesh.createForRadius(this.data.radius ?? 1, HALO_HEIGHT);
		this._halo.name = "portal-halo";
		this.add(this._halo);
	}

	private _disposeHalo() {
		if (!this._halo) return;
		this._halo.removeFromParent();
		SpawnSelectionMesh.dispose(this._halo);
		this._halo = null;
	}

	/**
	 * Open the destination directory for the player who entered, gated by a
	 * cooldown so it doesn't re-fire while the avatar lingers on the disc or
	 * arrives via travel.
	 */
	private _open(avatar: Component3D) {
		const cooldown = this.data.cooldown ?? 1500;
		const now = performance.now();
		if (now - this._lastTrigger < cooldown) return;
		this._lastTrigger = now;

		emitter.emit(GameEvents.PORTAL_OPEN, {
			portalId: this.data.id,
			avatar,
		});
	}

	/** @internal */
	getCollisionMesh() {
		if (this._collision == null) {
			const radius = this.data.radius ?? 1;
			const geo = new CylinderGeometry(radius, radius, 0.05, 32);
			this._collision = new Mesh(geo, getCollisionMaterial());
			this._collision.visible = false;
			this.add(this._collision);
		}
		return this._collision;
	}

	/** @internal */
	async onDataChange(opts: DataChangeOpts<PortalComponentData>) {
		if (opts.prev?.radius !== this.data.radius) {
			this._buildHalo();

			if (this._collision) {
				const radius = this.data.radius ?? 1;
				this._collision.geometry.dispose();
				this._collision.geometry = new CylinderGeometry(radius, radius, 0.05, 32);
			}
		}
	}

	/** @internal */
	protected dispose() {
		this._disposeHalo();

		if (this._collision) {
			this._collision.geometry?.dispose();
			this._collision = null;
		}
	}
}
