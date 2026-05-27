import { Component3D } from "../../abstract/component-3d";
import { ImageFactory } from "../../../internal/media/image";
import { ImageComponentData } from "./image-data";
import {
	Box3, Vector3, Quaternion, Object3D, PlaneGeometry, PerspectiveCamera,
	BufferGeometry, BufferAttribute, PointsMaterial, Points,
	LineBasicMaterial, LineSegments, SphereGeometry, MeshBasicMaterial,
	Mesh, BackSide, DoubleSide, MathUtils
} from "three";
import gsap from "gsap";

import InstancedMeshWrapper from "../../../internal/pipeline/instance-mesh-wrapper";
import BorderFactory, { BorderWrapper } from "../../../internal/border";
import Camera from "../../../camera";
import Scene from "../../../internal/scene";
import Mediator from "../../../internal/mediator";
import UIOverlay from "../../../internal/ui-overlay";

import {
	IS_EDIT_MODE,
	SET_SHADOW_NEEDS_UPDATE,
	CANVAS,
} from "../../../internal/constants";
import { LEGACY_fixScale } from "../../../internal/utils/legacy";

export type { ImageComponentData } from "./image-data";

const IMAGE_EVENTS = {
	INTERACT: "INTERACT",
	INTERACT_ENTER: "INTERACT_ENTER",
	INTERACT_EXIT: "INTERACT_EXIT",
	FULLSCREEN_OPEN: "FULLSCREEN_OPEN",
	FULLSCREEN_CLOSE: "FULLSCREEN_CLOSE",
} as const;

const _camPos = new Vector3();
const _camQuat = new Quaternion();
const _camDir = new Vector3();
const _toArt = new Vector3();

const BLOCKED_KEYS = new Set([
	"KeyW", "KeyA", "KeyS", "KeyD",
	"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
	"Space", "ShiftLeft", "ShiftRight",
]);

export class ImageComponent extends Component3D<ImageComponentData> {

	private _imageFactory: ImageFactory = null;
	_image: InstancedMeshWrapper = null;
	private _border: BorderWrapper = null;
	private _interaction: Component3D = null;
	private _cleanup: (() => void) | null = null;

	private _isShowing = false;
	private _animating = false;
	private _tempMesh: Mesh = null;
	private _overlayFog: Mesh = null;
	private _starField: Points = null;
	private _starTrails: LineSegments = null;
	private _starFieldVelocities: any[] = null;
	private _starFieldPrevPositions: Float32Array = null;
	private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
	private _inputBlocker: ((e: KeyboardEvent) => void) | null = null;
	private _mouseBlocker: ((e: Event) => void) | null = null;
	private _inRange = false;
	private _infoVisible = false;

	constructor(opts) {
		super(opts);
		this._imageFactory = opts.imageFactory;
	}

	protected async init() {
		this._image = await this._imageFactory.get(this.opts.space, { ...this.data });
		const scaleRatio = this._image.mesh.baseGeometry.opts.scaleRatio;
		this._border = BorderFactory.get({
			component: this,
			borderOpts: {
				borderSize: this.data.borderSize, borderDepth: this.data.borderDepth,
				borderColor: this.data.borderColor, borderOpacity: this.data.borderOpacity,
				hasBorder: this.data.hasBorder, scaleRatio,
			},
		});
		LEGACY_fixScale(this, scaleRatio);
		this.space.add(this._border.getCollisionMesh());
		this._image.attachTo(this);
		if (this.data.actionKey && !IS_EDIT_MODE) {
			await this._createInteraction();
			this._setupKeyHandler();
			this._cleanup = this.space.use({ onFrame: () => { this._updateStarField(); this._updateInfoCard(); } });
		}
	}

	private async _createInteraction() {
		const keyMap = { "E": "KeyE", "F": "KeyF", "G": "KeyG", "I": "KeyI" };
		const key = keyMap[this.data.actionKey] || "KeyE";
		this._interaction = await this.space.components.create({
			type: "interaction", position: this.data.position,
			distance: this.data.focusDistance ?? 9,
			atlas: `keyboard_${this.data.actionKey.toLowerCase()}`,
			key, billboard: true,
		});
		// Hide the visual but keep interaction active
		if ((this._interaction as any).scale) {
			(this._interaction as any).scale.set(0, 0, 0);
		}
		(this._interaction as any).onInteraction?.(() => {
			if (!this._isLookedAt()) return;
			this.emit(IMAGE_EVENTS.INTERACT);
			if (!this._animating && !this._isShowing) this._openFullscreen();
			else if (this._isShowing && !this._animating) this._closeFullscreen();
		});
		(this._interaction as any).onInteractEnter?.(() => {
			this._inRange = true;
			this.emit(IMAGE_EVENTS.INTERACT_ENTER);
		});
		(this._interaction as any).onInteractExit?.(() => {
			this._inRange = false;
			this.emit(IMAGE_EVENTS.INTERACT_EXIT);
			if (this._infoVisible) { this._hideInfoCard(); this._infoVisible = false; }
		});
	}

	private _setupKeyHandler() {
		this._keyHandler = (e: KeyboardEvent) => {
			if (e.code === "Escape" && this._isShowing && !this._animating) this._closeFullscreen();
		};
		document.addEventListener("keydown", this._keyHandler);
	}

	private _isLookedAt(): boolean {
		Camera.current.getWorldPosition(_camPos);
		Camera.current.getWorldDirection(_camDir);
		_toArt.copy(this._image.position).sub(_camPos).normalize();
		return _camDir.dot(_toArt) > 0.98;
	}

	private get _overlayId() { return `image-${this.data.id ?? this.uuid}`; }

	private _showInfoCard() {
		const d = this.data;
		const bg = d.infoBgColor ?? "#091117";
		const tc = d.infoTextColor ?? "#ffffff";
		const op = d.infoOpacity ?? 75;
		const hex = op > 99 ? "" : (op < 10 ? "0" + op : "" + op);

		UIOverlay.setContent(this._overlayId, `
			<div style="position:fixed;right:15px;bottom:69px;padding:11px 22px 11px 11px;background:${bg}${hex};color:${tc};border-radius:12px;display:flex;align-items:center;gap:18px;pointer-events:auto;">
				${d.actionKey ? `<div style="font-size:22pt;font-weight:900;border:2px solid currentcolor;border-radius:9px;width:50px;aspect-ratio:1/1;display:flex;justify-content:center;align-items:center;">${d.actionKey}</div>` : ""}
				<div style="display:flex;flex-direction:column;gap:6px;min-width:118px;">
					${d.title ? `<h2 style="margin:0;font-size:14pt;">${d.title}</h2>` : ""}
					${d.artist ? `<span style="font-size:11pt;opacity:0.7;">${d.artist}</span>` : ""}
					${d.description ? `<span style="font-size:11pt;">${d.description}</span>` : ""}
				</div>
			</div>
		`);
	}

	private _hideInfoCard() {
		UIOverlay.removeLayer(this._overlayId);
	}

	private _updateInfoCard() {
		if (this._isShowing) return;
		const shouldShow = this._inRange && this._isLookedAt();
		if (shouldShow && !this._infoVisible) {
			this._showInfoCard();
			this._infoVisible = true;
		}
		else if (!shouldShow && this._infoVisible) {
			this._hideInfoCard();
			this._infoVisible = false;
		}
	}

	private _disableControls() {
		document.exitPointerLock();
		Mediator.requestPointerLockOnClick = false;
		this._inputBlocker = (e: KeyboardEvent) => {
			if (BLOCKED_KEYS.has(e.code)) { e.stopImmediatePropagation(); e.preventDefault(); }
		};
		document.addEventListener("keydown", this._inputBlocker, true);
		document.addEventListener("keyup", this._inputBlocker, true);
		this._mouseBlocker = (e: Event) => { e.stopImmediatePropagation(); };
		CANVAS?.addEventListener("mousemove", this._mouseBlocker, true);
		CANVAS?.addEventListener("mousedown", this._mouseBlocker, true);
	}

	private _enableControls() {
		if (this._inputBlocker) {
			document.removeEventListener("keydown", this._inputBlocker, true);
			document.removeEventListener("keyup", this._inputBlocker, true);
			this._inputBlocker = null;
		}
		if (this._mouseBlocker) {
			CANVAS?.removeEventListener("mousemove", this._mouseBlocker, true);
			CANVAS?.removeEventListener("mousedown", this._mouseBlocker, true);
			this._mouseBlocker = null;
		}
		Mediator.requestPointerLockOnClick = true;
		setTimeout(() => { CANVAS?.requestPointerLock?.(); }, 100);
	}

	private get _fullscreenId() { return `image-fs-${this.data.id ?? this.uuid}`; }

	private _showFullscreenUI() {
		const d = this.data;
		UIOverlay.setContent(this._fullscreenId, `
			<div style="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;">
				<div style="display:flex;justify-content:flex-end;padding:56px 276px;pointer-events:auto;">
					<button id="image-fs-close-${this.uuid}" style="color:white;font-size:20pt;font-weight:600;background:none;border:none;cursor:pointer;">✕</button>
				</div>
				<div style="display:flex;flex-direction:column;align-items:center;padding-bottom:6.9vh;text-shadow:0px 1px 1px rgba(0,0,0,0.09),1px 2px 2px rgba(0,0,0,0.09),2px 4px 4px rgba(0,0,0,0.09),4px 8px 8px rgba(0,0,0,0.09);">
					${d.title ? `<h2 style="color:white;font-size:18pt;margin:0 0 4px 0;">${d.title}</h2>` : ""}
					${d.artist ? `<span style="color:white;font-size:13pt;opacity:0.7;margin-bottom:4px;">${d.artist}</span>` : ""}
					${d.description ? `<p style="color:white;font-size:13pt;margin:0 0 12px 0;max-width:40vw;text-align:center;">${d.description}</p>` : ""}
				</div>
			</div>
		`);

		setTimeout(() => {
			document.getElementById(`image-fs-close-${this.uuid}`)
				?.addEventListener("click", () => {
					if (!this._animating && this._isShowing) this._closeFullscreen();
				});
		}, 50);
	}

	private _hideFullscreenUI() {
		UIOverlay.removeLayer(this._fullscreenId);
	}

	private _openFullscreen() {
		this._animating = true;
		this._isShowing = true;
		this._disableControls();
		this._hideInfoCard();
		this.emit(IMAGE_EVENTS.FULLSCREEN_OPEN);

		const texture = (this._image.mesh as any).material?.map ?? (this._image.mesh as any).baseMaterial?.map;
		const scaleRatio = this._image.mesh.baseGeometry?.opts?.scaleRatio ?? 1;
		const startPos = new Vector3().copy(this._image.position);
		const startQuat = new Quaternion(this._image.rotation[0], this._image.rotation[1], this._image.rotation[2], this._image.rotation[3]);
		const wrapperScale = this._image.scale.clone();

		this._image.visible = false;

		const geo = new PlaneGeometry(scaleRatio, 1);
		const mat = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide, depthWrite: false, depthTest: false });
		this._tempMesh = new Mesh(geo, mat);
		this._tempMesh.renderOrder = 102;
		this._tempMesh.position.copy(startPos);
		this._tempMesh.quaternion.copy(startQuat);
		this._tempMesh.scale.copy(wrapperScale);
		Scene.add(this._tempMesh);

		const fogGeo = new SphereGeometry(50, 32, 32);
		const fogMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.01, side: BackSide, depthWrite: false, depthTest: false });
		this._overlayFog = new Mesh(fogGeo, fogMat);
		Camera.current.getWorldPosition(_camPos);
		this._overlayFog.position.copy(_camPos);
		this._overlayFog.renderOrder = 100;
		Scene.add(this._overlayFog);

		Camera.current.getWorldPosition(_camPos);
		Camera.current.getWorldQuaternion(_camQuat);

		const imageWorldHeight = wrapperScale.y;
		const imageWorldWidth = scaleRatio * wrapperScale.x;
		let focusDist = this.data.focusDistance ?? 9;
		const cam = Camera.current;
		if (cam instanceof PerspectiveCamera) {
			const fovRad = MathUtils.degToRad(cam.fov);
			const halfTan = Math.tan(fovRad / 2);
			const distForHeight = imageWorldHeight / (1.2 * halfTan);
			const distForWidth = imageWorldWidth / (1.8 * halfTan * cam.aspect);
			focusDist = Math.max(distForHeight, distForWidth);
		}

		const targetPos = new Vector3(0, 0, -focusDist).applyQuaternion(_camQuat).add(_camPos);
		const tempObj = new Object3D();
		tempObj.position.copy(targetPos);
		tempObj.lookAt(_camPos);
		const targetQuat = new Quaternion().setFromEuler(tempObj.rotation);
		if (this._tempMesh.quaternion.dot(targetQuat) < 0) { targetQuat.x *= -1; targetQuat.y *= -1; targetQuat.z *= -1; targetQuat.w *= -1; }

		this._addStarField(targetPos);

		gsap.to(this._tempMesh.position, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 1, ease: "power2.inOut" });
		gsap.to(this._tempMesh.quaternion, { x: targetQuat.x, y: targetQuat.y, z: targetQuat.z, w: targetQuat.w, duration: 1, ease: "power2.inOut" });
		gsap.to(this._overlayFog.material, { opacity: 0.69, duration: 1, ease: "power2.inOut", onUpdate: () => { this._overlayFog.material.needsUpdate = true; }, onComplete: () => { this._animating = false; this._showFullscreenUI(); } });
	}

	private _closeFullscreen() {
		this._animating = true;
		this._hideFullscreenUI();
		const returnPos = new Vector3().copy(this._image.position);
		const returnQuat = new Quaternion(this._image.rotation[0], this._image.rotation[1], this._image.rotation[2], this._image.rotation[3]);

		gsap.to(this._tempMesh.position, { x: returnPos.x, y: returnPos.y, z: returnPos.z, duration: 1, ease: "power2.inOut" });
		gsap.to(this._tempMesh.quaternion, { x: returnQuat.x, y: returnQuat.y, z: returnQuat.z, w: returnQuat.w, duration: 1, ease: "power2.inOut" });
		gsap.to(this._overlayFog.material, {
			opacity: 0, duration: 1, ease: "power2.inOut",
			onUpdate: () => { this._overlayFog.material.needsUpdate = true; },
			onComplete: () => {
				this._removeStarField();
				this._removeOverlayFog();
				this._removeTempMesh();
				this._image.visible = true;
				this._isShowing = false;
				this._animating = false;
				this._enableControls();
				this.emit(IMAGE_EVENTS.FULLSCREEN_CLOSE);
			},
		});
	}

	private _removeTempMesh() {
		if (this._tempMesh) { Scene.remove(this._tempMesh); this._tempMesh.geometry.dispose(); (this._tempMesh.material as MeshBasicMaterial).dispose(); this._tempMesh = null; }
	}

	private _addStarField(targetPosition: Vector3) {
		const count = 200;
		const geo = new BufferGeometry();
		const positions = new Float32Array(count * 3);
		const velocities = [];
		const bounds = 20;
		for (let i = 0; i < count * 3; i += 3) {
			const radius = Math.random() * bounds;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			positions[i] = targetPosition.x + radius * Math.sin(phi) * Math.cos(theta);
			positions[i + 1] = targetPosition.y + radius * Math.sin(phi) * Math.sin(theta);
			positions[i + 2] = targetPosition.z + radius * Math.cos(phi);
			const speed = 0.005 + Math.random() * 0.01;
			const dir = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
			velocities.push({ x: dir.x * speed, y: dir.y * speed, z: dir.z * speed, centerX: targetPosition.x, centerY: targetPosition.y, centerZ: targetPosition.z, bounds });
		}
		geo.setAttribute("position", new BufferAttribute(positions, 3));
		this._starField = new Points(geo, new PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false }));
		this._starField.renderOrder = 101;
		this._starFieldVelocities = velocities;
		this._starFieldPrevPositions = new Float32Array(positions);
		Scene.add(this._starField);
		const trailGeo = new BufferGeometry();
		trailGeo.setAttribute("position", new BufferAttribute(new Float32Array(count * 6), 3));
		this._starTrails = new LineSegments(trailGeo, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false, depthTest: false }));
		this._starTrails.renderOrder = 101;
		Scene.add(this._starTrails);
	}

	private _updateStarField() {
		if (!this._starField) return;
		const positions = this._starField.geometry.attributes.position.array as Float32Array;
		const trailPositions = this._starTrails.geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < positions.length; i += 3) {
			const vel = this._starFieldVelocities[i / 3];
			trailPositions[i * 2] = this._starFieldPrevPositions[i];
			trailPositions[i * 2 + 1] = this._starFieldPrevPositions[i + 1];
			trailPositions[i * 2 + 2] = this._starFieldPrevPositions[i + 2];
			positions[i] += vel.x; positions[i + 1] += vel.y; positions[i + 2] += vel.z;
			trailPositions[i * 2 + 3] = positions[i];
			trailPositions[i * 2 + 4] = positions[i + 1];
			trailPositions[i * 2 + 5] = positions[i + 2];
			this._starFieldPrevPositions[i] = positions[i];
			this._starFieldPrevPositions[i + 1] = positions[i + 1];
			this._starFieldPrevPositions[i + 2] = positions[i + 2];
			const dx = positions[i] - vel.centerX; const dy = positions[i + 1] - vel.centerY; const dz = positions[i + 2] - vel.centerZ;
			if (Math.sqrt(dx * dx + dy * dy + dz * dz) > vel.bounds) {
				const t = Math.random() * Math.PI * 2; const p = Math.acos(2 * Math.random() - 1); const r = Math.random() * vel.bounds;
				positions[i] = vel.centerX + r * Math.sin(p) * Math.cos(t);
				positions[i + 1] = vel.centerY + r * Math.sin(p) * Math.sin(t);
				positions[i + 2] = vel.centerZ + r * Math.cos(p);
				this._starFieldPrevPositions[i] = positions[i]; this._starFieldPrevPositions[i + 1] = positions[i + 1]; this._starFieldPrevPositions[i + 2] = positions[i + 2];
			}
		}
		this._starField.geometry.attributes.position.needsUpdate = true;
		this._starTrails.geometry.attributes.position.needsUpdate = true;
	}

	private _removeStarField() {
		if (this._starField) { Scene.remove(this._starField); this._starField.geometry.dispose(); (this._starField.material as PointsMaterial).dispose(); this._starField = null; this._starFieldVelocities = null; this._starFieldPrevPositions = null; }
		if (this._starTrails) { Scene.remove(this._starTrails); this._starTrails.geometry.dispose(); (this._starTrails.material as LineBasicMaterial).dispose(); this._starTrails = null; }
	}

	private _removeOverlayFog() {
		if (this._overlayFog) { Scene.remove(this._overlayFog); this._overlayFog.geometry.dispose(); (this._overlayFog.material as MeshBasicMaterial).dispose(); this._overlayFog = null; }
	}

	onInteraction(cb: () => void) { return this.on(IMAGE_EVENTS.INTERACT, cb); }
	onInteractEnter(cb: () => void) { return this.on(IMAGE_EVENTS.INTERACT_ENTER, cb); }
	onInteractExit(cb: () => void) { return this.on(IMAGE_EVENTS.INTERACT_EXIT, cb); }
	onFullscreenOpen(cb: () => void) { return this.on(IMAGE_EVENTS.FULLSCREEN_OPEN, cb); }
	onFullscreenClose(cb: () => void) { return this.on(IMAGE_EVENTS.FULLSCREEN_CLOSE, cb); }

	async onDataChange(opts) {
		if (opts.prev?.useMipMap != this.data.useMipMap || opts.prev?.minFilter != this.data.minFilter || opts.prev?.magFilter != this.data.magFilter) {
			this._imageFactory.dispose(this._image);
			this._image = await this._imageFactory.get(this.opts.space, { ...this.data });
			this._image.attachTo(this);
		}
		this._image.opacity = this.data.opacity;
		BorderFactory.updateBorder(this._border, {
			borderColor: this.data.borderColor, borderSize: this.data.borderSize,
			borderDepth: this.data.borderDepth, borderOpacity: this.data.borderOpacity,
			hasBorder: this.data.hasBorder, scaleRatio: this._image.mesh.baseGeometry.opts.scaleRatio,
		});
		if (IS_EDIT_MODE && opts?.isProgress != true) { SET_SHADOW_NEEDS_UPDATE(true); }
	}

	getCollisionMesh() { return this._border.getCollisionMesh(); }
	protected _getBBoxImp(target: Box3) { return target.setFromObject(this.getCollisionMesh()); }

	protected dispose() {
		this._imageFactory.dispose(this._image);
		BorderFactory.dispose(this._border);
		this._border.getCollisionMesh().removeFromParent();
		if (this._keyHandler) { document.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
		this._enableControls();
		if (this._cleanup) { this._cleanup(); this._cleanup = null; }
		if (this._interaction) { (this._interaction as any).destroy?.(); this._interaction = null; }
		this._removeStarField();
		this._removeOverlayFog();
		this._removeTempMesh();
		this._hideInfoCard();
		this._hideFullscreenUI();
		this._image = null;
		this._border = null;
	}
}
