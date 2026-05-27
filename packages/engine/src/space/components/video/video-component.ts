// @ts-check

import { Component3D } from "../../abstract/component-3d";
import { VideoFactory } from "../../../internal/media/video";
import VideoWrapper from "../../../internal/media/video/wrapper";
import {
	IS_EDIT_MODE,
	USER_INTERACTED,
	CANVAS,
} from "../../../internal/constants";
import { VideoComponentData } from "./video-data";
import {
	Box3, Vector3, Quaternion, Object3D, PlaneGeometry, PerspectiveCamera,
	BufferGeometry, BufferAttribute, PointsMaterial, Points,
	LineBasicMaterial, LineSegments, SphereGeometry, MeshBasicMaterial,
	Mesh, BackSide, DoubleSide, MathUtils,
} from "three";
import gsap from "gsap";

import Camera from "../../../camera";
import { PositionalAudio } from "../../../internal/utils/positional-audio";
import { LEGACY_fixScale } from "../../../internal/utils/legacy";
import BorderFactory, {
	BorderOpts,
	BorderWrapper,
} from "../../../internal/border";
import UIOverlay from "../../../internal/ui-overlay";
import Mediator from "../../../internal/mediator";
import Scene from "../../../internal/scene";

export type { VideoComponentData } from "./video-data";

const _camPos = new Vector3();
const _camQuat = new Quaternion();
const _camDir = new Vector3();
const _toComp = new Vector3();
const _compPos = new Vector3();

const VIDEO_EVENTS = {
	INTERACT: "INTERACT",
	INTERACT_ENTER: "INTERACT_ENTER",
	INTERACT_EXIT: "INTERACT_EXIT",
	FULLSCREEN_OPEN: "FULLSCREEN_OPEN",
	FULLSCREEN_CLOSE: "FULLSCREEN_CLOSE",
} as const;

const BLOCKED_KEYS = new Set([
	"KeyW", "KeyA", "KeyS", "KeyD",
	"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
	"Space", "ShiftLeft", "ShiftRight",
]);

/**
 * @public
 *
 * A component that displays a video in 3D space with audio spatialization support.
 *
 * The video can be rendered on a flat plane or a curved surface (controlled by
 * {@link VideoComponentData.displayMode}), and supports two audio spatialization modes:
 * ambient (uniform volume) and spatial (distance-based attenuation).
 * See {@link VideoComponentData.audioType} for details.
 *
 * The component also supports an optional decorative border frame around the video
 * (see {@link VideoComponentData.hasBorder} and related border properties), adjustable
 * opacity, and a preview image displayed when the video is not playing.
 *
 * Videos are lazy-loaded: only the preview image is shown until the player is within
 * {@link VideoComponentData.loadDistance}. The actual video element is created on demand
 * and disposed when the player moves away.
 *
 * Use {@link play} and {@link pause} to control video playback programmatically,
 * or set {@link VideoComponentData.autoPlay} to start playback automatically.
 *
 * See {@link VideoComponentData} for the full data schema used to configure a video component.
 *
 * @example
 * // Create a basic flat video with autoplay and spatial audio
 * const video = await space.components.create({
 *   type: "video",
 *   url: "https://example.com/video.mp4",
 *   position: { x: 0, y: 2, z: -5 },
 *   rotation: { x: 0, y: 0, z: 0 },
 *   scale: { x: 1, y: 1, z: 1 },
 *   autoPlay: true,
 *   volume: 0.8,
 *   audioType: "spatial",
 *   audioRange: 10,
 *   opacity: 1,
 *   displayMode: "flat",
 *   curvedAngle: Math.PI / 4,
 * });
 *
 * @example
 * // Create a curved video with a border and ambient audio
 * const curvedVideo = await space.components.create({
 *   type: "video",
 *   url: "https://example.com/presentation.mp4",
 *   preview: "https://example.com/thumbnail.jpg",
 *   position: { x: 0, y: 3, z: -8 },
 *   autoPlay: false,
 *   volume: 1,
 *   audioType: "ambient",
 *   audioRange: 3,
 *   opacity: 1,
 *   displayMode: "curved",
 *   curvedAngle: 0.5,
 *   hasBorder: true,
 *   borderColor: "#222222",
 *   borderSize: 0.08,
 *   borderDepth: 0.15,
 *   borderOpacity: 1,
 * });
 *
 * // Start playback manually
 * curvedVideo.play();
 *
 * // Check if it's playing
 * console.log(curvedVideo.isPlaying); // true
 *
 * // Pause it
 * curvedVideo.pause();
 */
export class VideoComponent extends Component3D<VideoComponentData> {
	//
	#videoFactory: VideoFactory = null;

	private _video: VideoWrapper = null;

	private _border: BorderWrapper = null;

	private _posAudio: PositionalAudio = null;

	private _videoLoaded = false;

	private _videoLoading = false;

	private _videoLoadPromise: Promise<void> | null = null;

	private _cleanup: (() => void) | null = null;

	// Interaction / fullscreen state
	private _interaction: Component3D = null;
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
	private _wasPlaying = false;

	/**
	 * @internal
	 */
	constructor(opts) {
		super(opts);

		this.#videoFactory = opts.videoFactory;
	}

	/** @internal */
	protected async init() {
		//
		await this._initPreview();

		// In edit mode, load video immediately (no lazy loading)
		if (IS_EDIT_MODE) {
			await this._loadVideoLazy();
		}

		if (this.data.actionKey) {
			await this._createInteraction();
			this._setupKeyHandler();
		}

		// Single frame-loop registration for both distance management and interaction
		if (!IS_EDIT_MODE) {
			this._cleanup = this.space.use({
				onFrame: () => {
					if (this.data.actionKey) {
						this._updateStarField();
						this._updateInfoCard();
					}
					this._onFrame();
				},
			});
		}
	}

	private _prevData = {
		url: null,
		preview: null,
	};

	/**
	 * Phase 1: Load preview image only, set up border.
	 * No video element is created yet.
	 */
	private async _initPreview() {
		//
		this._disposeVideo();

		this._prevData.url = this.data.url;
		this._prevData.preview = this.data.preview;

		this._video = await this.#videoFactory.getPreviewOnly(this, this.data);

		const scaleRatio = this._video.scaleRatio;

		this._border = BorderFactory.get({
			component: this,
			borderOpts: {
				borderSize: this.data.borderSize,
				borderDepth: this.data.borderDepth,
				borderColor: this.data.borderColor,
				borderOpacity: this.data.borderOpacity,
				hasBorder: this.data.hasBorder,
				scaleRatio,
			},
		});

		this.space.add(this._border.getCollisionMesh());

		LEGACY_fixScale(this, scaleRatio);

		this.add(this._video);

		this._updateBorder();

		this._video.opacity = this.data.opacity;
	}

	/**
	 * Phase 2: Load the actual video element when the player is in range.
	 */
	private async _loadVideoLazy() {
		//
		if (this._videoLoaded) return;
		if (this._videoLoadPromise) return this._videoLoadPromise;

		this._videoLoading = true;

		this._videoLoadPromise = (async () => {
			try {
				const video = await this.#videoFactory.loadVideo(this._video, this.data.url);

				if (!video) {
					this._videoLoading = false;
					return;
				}

				this._videoLoaded = true;

				this.container._audioManager.addAudioSource(this, video);

				USER_INTERACTED.then(() => {
					//
					if (this._videoEl == null) return;

					this._posAudio = new PositionalAudio();

					this.add(this._posAudio);

					this._posAudio.setSource(this._videoEl);

					this._updateAudioType();
				});

				this._update3D();
			}
			catch (err) {
				console.error("Failed to lazy-load video:", err);
			}
			finally {
				this._videoLoading = false;
				this._videoLoadPromise = null;
			}
		})();

		return this._videoLoadPromise;
	}

	/**
	 * Frame loop: check distance to camera, load/play/pause accordingly.
	 */
	private _onFrame() {
		//
		if (!this._video) return;

		// Don't interfere with playback while fullscreen is open
		if (this._isShowing) return;

		Camera.current.getWorldPosition(_camPos);
		this.getWorldPosition(_compPos);

		const dist = _camPos.distanceTo(_compPos);
		const loadDist = this.data.loadDistance ?? 20;

		if (dist <= loadDist) {
			// In range — load video if needed
			if (!this._videoLoaded && !this._videoLoading) {
				this._loadVideoLazy();
			}
			else if (this._videoLoaded) {
				// Play when in range and looking at it
				Camera.current.getWorldDirection(_camDir);
				_toComp.copy(_compPos).sub(_camPos).normalize();
				const dot = _camDir.dot(_toComp);

				if (dot > 0.85 && !this.isPlaying) {
					this._video.play();
				}
				else if (dot <= 0.85 && this.isPlaying && !this._isShowing) {
					this._video.pause();
				}
			}
		}
		else {
			// Out of range — pause
			if (this._videoLoaded && this.isPlaying && !this._isShowing) {
				this._video.pause();
			}
		}
	}

	// --- Interaction / Fullscreen ---

	private async _createInteraction() {
		const keyMap = { "E": "KeyE", "F": "KeyF", "G": "KeyG", "I": "KeyI" };
		const key = keyMap[this.data.actionKey] || "KeyE";
		this._interaction = await this.space.components.create({
			type: "interaction", position: this.data.position,
			distance: this.data.focusDistance ?? 9,
			atlas: `keyboard_${this.data.actionKey.toLowerCase()}`,
			key, billboard: true,
		});
		if ((this._interaction as any).scale) {
			(this._interaction as any).scale.set(0, 0, 0);
		}
		(this._interaction as any).onInteraction?.(() => {
			if (!this._isLookedAt()) return;
			this.emit(VIDEO_EVENTS.INTERACT);
			if (!this._animating && !this._isShowing) this._openFullscreen();
			else if (this._isShowing && !this._animating) this._closeFullscreen();
		});
		(this._interaction as any).onInteractEnter?.(() => {
			this._inRange = true;
			this.emit(VIDEO_EVENTS.INTERACT_ENTER);
		});
		(this._interaction as any).onInteractExit?.(() => {
			this._inRange = false;
			this.emit(VIDEO_EVENTS.INTERACT_EXIT);
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
		this._video.getWorldPosition(_toComp);
		_toComp.sub(_camPos).normalize();
		return _camDir.dot(_toComp) > 0.98;
	}

	private get _overlayId() { return `video-${this.data.id ?? this.uuid}`; }

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

	private async _openFullscreen() {
		this._animating = true;
		this._isShowing = true;
		this._disableControls();
		this._hideInfoCard();
		this.emit(VIDEO_EVENTS.FULLSCREEN_OPEN);

		// Ensure video is loaded before proceeding
		if (!this._videoLoaded) {
			await this._loadVideoLazy();
		}
		if (!this._videoLoaded) {
			// Load failed — abort fullscreen
			this._animating = false;
			this._isShowing = false;
			this._enableControls();
			return;
		}
		if (!this.isPlaying) this._video.play();

		const texture = (this._video.mesh as any).diffuseMaterials?.material?.map
			?? (this._video.mesh as any).material?.map;
		const scaleRatio = this._video.scaleRatio ?? 1;

		const startPos = new Vector3();
		this._video.getWorldPosition(startPos);
		const startQuat = new Quaternion();
		this._video.getWorldQuaternion(startQuat);
		const wrapperScale = new Vector3();
		this._video.getWorldScale(wrapperScale);

		this._video.visible = false;

		const geo = new PlaneGeometry(1, 1);
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
		const imageWorldWidth = wrapperScale.x;
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

		const returnPos = new Vector3();
		this._video.getWorldPosition(returnPos);
		const returnQuat = new Quaternion();
		this._video.getWorldQuaternion(returnQuat);

		gsap.to(this._tempMesh.position, { x: returnPos.x, y: returnPos.y, z: returnPos.z, duration: 1, ease: "power2.inOut" });
		gsap.to(this._tempMesh.quaternion, { x: returnQuat.x, y: returnQuat.y, z: returnQuat.z, w: returnQuat.w, duration: 1, ease: "power2.inOut" });
		gsap.to(this._overlayFog.material, {
			opacity: 0, duration: 1, ease: "power2.inOut",
			onUpdate: () => { this._overlayFog.material.needsUpdate = true; },
			onComplete: () => {
				this._removeStarField();
				this._removeOverlayFog();
				this._removeTempMesh();
				this._video.visible = true;
				this._isShowing = false;
				this._animating = false;
				this._enableControls();
				this.emit(VIDEO_EVENTS.FULLSCREEN_CLOSE);
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

	private get _fullscreenId() { return `video-fs-${this.data.id ?? this.uuid}`; }
	private get _popupId() { return `video-popup-${this.data.id ?? this.uuid}`; }

	private _showFullscreenUI() {
		const d = this.data;
		const buttons = (d.buttons || []).filter(b => b.text && b.link);

		const buttonHtml = buttons.map((b, i) =>
			`<button data-btn-idx="${i}" style="background:linear-gradient(1deg,#5d5d5d,#919191,#939393);width:168px;height:46px;border-radius:23px;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #333;font-size:12pt;font-weight:600;cursor:pointer;pointer-events:auto;transition:transform .2s;"
				onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">${b.text}</button>`
		).join("");

		UIOverlay.setContent(this._fullscreenId, `
			<div style="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;">
				<div style="display:flex;justify-content:flex-end;padding:56px 276px;pointer-events:auto;">
					<button id="video-fs-close-${this.uuid}" style="color:white;font-size:20pt;font-weight:600;background:none;border:none;cursor:pointer;">✕</button>
				</div>
				<div style="display:flex;flex-direction:column;align-items:center;padding-bottom:6.9vh;text-shadow:0px 1px 1px rgba(0,0,0,0.09),1px 2px 2px rgba(0,0,0,0.09),2px 4px 4px rgba(0,0,0,0.09),4px 8px 8px rgba(0,0,0,0.09);">
					${d.title ? `<h2 style="color:white;font-size:18pt;margin:0 0 4px 0;">${d.title}</h2>` : ""}
					${d.artist ? `<span style="color:white;font-size:13pt;opacity:0.7;margin-bottom:4px;">${d.artist}</span>` : ""}
					${d.description ? `<p style="color:white;font-size:13pt;margin:0 0 12px 0;max-width:40vw;text-align:center;">${d.description}</p>` : ""}
					${buttons.length > 0 ? `<div style="display:flex;gap:16px;margin-top:8px;">${buttonHtml}</div>` : ""}
				</div>
			</div>
		`);

		// Bind events after render
		setTimeout(() => {
			const closeBtn = document.getElementById(`video-fs-close-${this.uuid}`);
			closeBtn?.addEventListener("click", () => this._closeFullscreen());

			buttons.forEach((b, i) => {
				const el = document.querySelector(`[data-btn-idx="${i}"]`) as HTMLElement;
				el?.addEventListener("click", () => {
					if (b.action === "redirect") {
						window.open(b.link, "_blank");
					}
					else if (b.action === "popup") {
						this._showPopup(b.link, b.text);
					}
				});
			});
		}, 50);
	}

	private _hideFullscreenUI() {
		UIOverlay.removeLayer(this._fullscreenId);
		UIOverlay.removeLayer(this._popupId);
	}

	private _showPopup(url: string, title: string) {
		UIOverlay.setContent(this._popupId, `
			<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90vw;max-width:1200px;height:80vh;display:flex;flex-direction:column;background:white;border-radius:4px;overflow:hidden;pointer-events:auto;z-index:200;">
				<div style="display:flex;justify-content:space-between;width:100%;padding:.375em;align-items:center;border-bottom:1px dotted #000;">
					<h2 style="margin:0;padding:0 8px;font-size:14pt;">${title}</h2>
					<button id="video-popup-close-${this.uuid}" style="font-weight:1000;border-radius:3px;padding:.125em .375em;border:1px solid black;cursor:pointer;">X</button>
				</div>
				<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>
			</div>
		`);

		setTimeout(() => {
			document.getElementById(`video-popup-close-${this.uuid}`)
				?.addEventListener("click", () => UIOverlay.removeLayer(this._popupId));
		}, 50);
	}

	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Legacy combined init — used by onDataChange when url/preview changes.
	 */
	private async _initVideo() {
		//
		this._videoLoaded = false;
		this._videoLoading = false;
		this._videoLoadPromise = null;

		await this._initPreview();

		// In edit mode, load video immediately
		if (IS_EDIT_MODE) {
			await this._loadVideoLazy();
		}
		// In runtime, the frame loop will handle loading
	}

	private _disposeVideo() {
		//
		if (this._video == null) return;

		this.container._audioManager.removeAudioSource(this);

		this._video?.dispose();

		this.remove(this._video);

		this._video = null;

		this._videoLoaded = false;
		this._videoLoading = false;
		this._videoLoadPromise = null;

		this._posAudio?.dispose();
	}

	private _updateVideo() {
		//
		if (
			this.data.url !== this._prevData.url ||
			this.data.preview !== this._prevData.preview
		) {
			return this._initVideo();
		}
	}

	private get _videoEl() {
		//
		return this._video?.videoData?.video;
	}

	private _updateAudioType() {
		//
		if (this._posAudio == null) return;

		this._posAudio.setAudioType(this.data.audioType);

		if (this.data.audioType === "spatial") {
			this._posAudio.setVolumeRange(this.data.audioRange);
		}
	}

	/**
	 * @internal
	 */
	onDataChange(opts) {
		//
		const res = this._updateVideo();

		this._update3D();

		if (
			opts.prev?.displayMode != this.data.displayMode ||
			opts.prev?.curvedAngle != this.data.curvedAngle
		) {
			this._video?.updateDisplayMode(this.data);
		}

		return res;
	}

	private _updateBorder() {
		//
		if (!this._border || !this._video) return;

		BorderFactory.updateBorder(this._border, {
			borderColor: this.data.borderColor,
			borderSize: this.data.borderSize,
			borderDepth: this.data.borderDepth,
			borderOpacity: this.data.borderOpacity,
			hasBorder: this.data.hasBorder,
			scaleRatio: this._video.scale.x,
		});
	}

	private _update3D() {
		//
		if (this._video == null) return;

		// Only control playback if video is actually loaded
		if (this._videoLoaded && this._videoEl) {
			if (this.data.autoPlay && !this.isPlaying) {
				this._video.play();
			}
			else if (!this.data.autoPlay && this.isPlaying) {
				this._video.pause();
			}

			this._updateAudioType();
		}

		this._video.opacity = this.data.opacity;

		this._updateBorder();
	}

	/**
	 * @internal
	 */
	getCollisionMesh() {
		return this._border.getCollisionMesh();
	}

	protected _getBBoxImp(target: Box3) {
		//
		return target.setFromObject(this.getCollisionMesh());
	}

	/** @internal */
	protected dispose() {
		//
		if (this._cleanup) {
			this._cleanup();
			this._cleanup = null;
		}

		if (this._keyHandler) { document.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
		this._enableControls();
		if (this._interaction) { (this._interaction as any).destroy?.(); this._interaction = null; }
		this._removeStarField();
		this._removeOverlayFog();
		this._removeTempMesh();
		this._hideInfoCard();
		this._hideFullscreenUI();

		this._disposeVideo();

		this._border?.getCollisionMesh().removeFromParent();

		BorderFactory.dispose(this._border);
	}

	/**
	 * Starts or resumes video playback.
	 */
	play() {
		return this._video?.play();
	}

	/**
	 * Pauses video playback at the current position.
	 */
	pause() {
		this._wasPlaying = false;
		return this._video?.pause();
	}

	onInteraction(cb: () => void) { return this.on(VIDEO_EVENTS.INTERACT, cb); }
	onInteractEnter(cb: () => void) { return this.on(VIDEO_EVENTS.INTERACT_ENTER, cb); }
	onInteractExit(cb: () => void) { return this.on(VIDEO_EVENTS.INTERACT_EXIT, cb); }
	onFullscreenOpen(cb: () => void) { return this.on(VIDEO_EVENTS.FULLSCREEN_OPEN, cb); }
	onFullscreenClose(cb: () => void) { return this.on(VIDEO_EVENTS.FULLSCREEN_CLOSE, cb); }

	/**
	 * Whether the video is currently playing. Returns `true` if the video is actively
	 * playing, `false` otherwise.
	 */
	get isPlaying() {
		return this._video?._isPlaying;
	}

	/**
	 * Whether the video file has been loaded into memory.
	 */
	get isVideoLoaded() {
		return this._videoLoaded;
	}
}
