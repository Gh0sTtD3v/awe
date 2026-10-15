import { Vector3 } from "three";
import Camera from "../camera";
import {
	CHUNK_SIZE,
	GLOBAL_TYPES,
	PRESET_TYPES,
	filterGlobalComponents,
	isGlobalComponent,
	isPresetType,
	posToChunkKey,
} from "@oncyberio/world-config";

/** Default location of the statically-served chunk files. */
const DEFAULT_CHUNK_URL = (key: string) => `/data/chunks/${key}.json`;

export class ChunkManager {

	private _space: any = null;
	private _currentKey: string | null = null;
	private _currentInfo: Record<string, any> | null = null;
	private _chunkComponents: any[] = [];
	private _loading = false;
	private _cleanup: (() => void) | null = null;
	private _onTransitionStart: (() => Promise<void>) | null = null;
	private _onTransitionEnd: (() => void) | null = null;
	private _chunkUrl: (key: string) => string = DEFAULT_CHUNK_URL;
	private _onForbidden: ((key: string) => void) | null = null;
	private _forbiddenKey: string | null = null;
	private _transitionPromise: Promise<void> | null = null;
	private _traveling = false;
	/** Whether the current chunk actually has data behind it. */
	private _currentChunkLoaded = false;

	/** World-default data for each preset singleton, before any override. */
	private _presetWorldDefaults = new Map<string, Record<string, any>>();
	/** Data keys currently overridden by the loaded chunk, per component id. */
	private _appliedPresetKeys = new Map<string, Set<string>>();

	get currentKey() { return this._currentKey; }
	get currentInfo() { return this._currentInfo; }
	get isLoading() { return this._loading; }
	get chunkSize() { return CHUNK_SIZE; }

	init(space: any, opts?: {
		onTransitionStart?: () => Promise<void>;
		onTransitionEnd?: () => void;
		/**
		 * Resolves a chunk key to the URL its data is fetched from. Defaults to
		 * the statically-served `/data/chunks/<key>.json`; hosts that serve
		 * chunks through an authenticated route override this.
		 */
		chunkUrl?: (key: string) => string;
		/** Called when the host denies access to a chunk (HTTP 403). */
		onForbidden?: (key: string) => void;
	}) {
		this._space = space;
		this._onTransitionStart = opts?.onTransitionStart ?? null;
		this._onTransitionEnd = opts?.onTransitionEnd ?? null;
		this._chunkUrl = opts?.chunkUrl ?? DEFAULT_CHUNK_URL;
		this._onForbidden = opts?.onForbidden ?? null;

		this._cleanup = space.use({
			onFrame: () => this._checkBoundary(),
		});
	}

	dispose() {
		this._cleanup?.();
		this._cleanup = null;
		this._unloadChunk();
		this._space = null;
	}

	/**
	 * Force-load a specific chunk by key.
	 * Returns a promise that resolves when the chunk is fully loaded.
	 */
	async loadChunk(targetKey: string) {
		// Wait out any transition already running rather than skipping this
		// one. Returning early here would let a caller believe the destination
		// was loaded when it never was — which drops the avatar into an empty
		// chunk with no ground under it.
		while (this._transitionPromise) {
			await this._transitionPromise;
		}

		if (targetKey === this._currentKey) return;

		await this._transition(targetKey);
	}

	/**
	 * Force reload the current chunk.
	 */
	async reload() {
		if (this._loading || !this._currentKey) return;
		await this._transition(this._currentKey);
	}

	/**
	 * Teleport the avatar to a world position, loading the destination chunk
	 * if it differs from the current one. Physics stays disabled until the
	 * destination is actually on screen, so the avatar can't fall through a
	 * world that hasn't streamed in yet.
	 *
	 * This is the shared "travel" primitive used by the portal directory UI.
	 */
	async travelTo(position: Vector3, avatar?: any): Promise<boolean> {
		const target = avatar ?? this._space?.components?.byType?.("avatar")?.[0];
		if (!target?.rigidBody) return false;

		const origin = target.position.clone();

		// Travel destinations are floor-level points, but an avatar's transform
		// origin is its centre — teleporting straight onto one leaves it buried
		// to the waist. Come in half a body height above the surface.
		const landing = position.clone();
		landing.y += this._landingOffset(target);

		const targetKey = posToChunkKey(landing);

		target.rigidBody.resetVelocities();
		target.rigidBody.enabled = false;

		// Suppress boundary detection for the whole trip: the avatar is mid-move
		// and the camera is still catching up, so neither is a trustworthy
		// reference until we've landed.
		this._traveling = true;

		let arrived = false;

		try {
			if (targetKey !== this._currentKey) {
				await this.loadChunk(targetKey);
			}
			arrived = this._currentKey === targetKey && this._currentChunkLoaded;

			if (!arrived) {
				console.warn(
					`Travel to ${targetKey} aborted: chunk unavailable. Staying put.`,
				);
			}
		}
		finally {
			// Landing somewhere with no ground is worse than not moving, so a
			// failed load leaves the player exactly where they were.
			const destination = arrived ? landing : origin;

			target.position.copy(destination);
			this._traveling = false;
			target.rigidBody.enabled = true;
			target.rigidBody.teleport(destination, target.quaternion);
		}

		return arrived;
	}

	/**
	 * Half the avatar's height, used to lift a floor-level travel destination
	 * up to where the avatar's centre should sit. Zero for anything that can't
	 * report its dimensions, which just restores the old flush placement.
	 */
	private _landingOffset(target: any): number {
		const height = target?.getDimensions?.()?.y;
		return typeof height === "number" && Number.isFinite(height)
			? height * 0.5
			: 0;
	}

	/**
	 * Which chunk the player is in is defined by the avatar, not the camera.
	 * A third-person camera lerps along behind the avatar, so using it would
	 * report the chunk you just left for several frames after a teleport — long
	 * enough to unload the chunk you had only just arrived in.
	 *
	 * In edit mode there is no avatar and the camera *is* the viewer, so it is
	 * the right reference there.
	 */
	private _boundaryPosition(): Vector3 | null {
		const avatar = this._space?.components?.byType?.("avatar")?.[0];
		if (avatar?.position) return avatar.position;

		return Camera.current?.position ?? null;
	}

	private _checkBoundary() {
		if (this._loading || this._traveling || !this._space) return;

		const position = this._boundaryPosition();
		if (!position) return;

		const key = posToChunkKey(position);
		if (key !== this._currentKey) {
			this._transition(key);
		}
	}

	/**
	 * Runs a transition and publishes it as {@link _transitionPromise} so that
	 * callers arriving mid-flight can await it instead of racing it.
	 */
	private _transition(targetKey: string): Promise<void> {
		const run = this._runTransition(targetKey).finally(() => {
			if (this._transitionPromise === run) this._transitionPromise = null;
		});

		this._transitionPromise = run;
		return run;
	}

	private async _runTransition(targetKey: string) {
		this._loading = true;

		try {
			if (this._onTransitionStart) {
				await this._onTransitionStart();
			}

			this._unloadChunk();

			this._forbiddenKey = null;
			const data = await this._fetchChunk(targetKey);

			if (data) {
				this._currentChunkLoaded = true;
				await this._loadChunk(targetKey, data);
			}
			else {
				const forbidden = this._forbiddenKey === targetKey;
				this._currentChunkLoaded = false;
				this._currentKey = targetKey;
				this._currentInfo = null;
				this._restorePresetDefaults();

				if (forbidden) {
					console.log(`Chunk ${targetKey}: access denied`);
					this._onForbidden?.(targetKey);
				}
				else {
					console.log(`Chunk ${targetKey}: empty (no file)`);
				}
			}

			this._updateURL(targetKey);
		}
		catch (err) {
			console.error(`Chunk transition failed:`, err);
		}
		finally {
			this._loading = false;

			if (this._onTransitionEnd) {
				this._onTransitionEnd();
			}
		}
	}

	private async _fetchChunk(key: string): Promise<any | null> {
		try {
			const res = await fetch(this._chunkUrl(key), { credentials: "include" });
			if (res.status === 403) {
				this._forbiddenKey = key;
				return null;
			}
			if (!res.ok) return null;
			return await res.json();
		}
		catch {
			return null;
		}
	}

	private async _loadChunk(key: string, data: any) {
		this._currentKey = key;
		this._currentInfo = data.info ?? null;

		// Apply this chunk's preset overrides to the existing singletons, and
		// restore world defaults for any key the previous chunk overrode but
		// this one doesn't — otherwise an override would stick when you leave
		// the chunk that set it.
		this._applyPresetOverrides(data.presets ?? {});

		// Create chunk assets (back-compat: older files used `components`)
		const assets = data.assets ?? data.components ?? {};
		const entries = Object.values(assets) as any[];

		// Built in parallel, matching how the initial space build loads each
		// priority group. Creating them one at a time serialises every model
		// fetch and parse behind the one before it.
		const created = await Promise.all(
			entries.map((entry) =>
				this._space.components.create(entry).catch((err: unknown) => {
					console.error(`Failed to create component ${entry.id}:`, err);
					return null;
				}),
			),
		);

		for (const comp of created) {
			if (comp) this._chunkComponents.push(comp);
		}

		console.log(
			`Chunk ${key}: ${Object.keys(data.presets ?? {}).length} preset overrides, ` +
			`${this._chunkComponents.length} assets`
		);
	}

	/**
	 * Resolve a preset entry to its target singleton. The map is keyed by
	 * component id; older chunk files relied on id and type coinciding, so fall
	 * back to a type lookup for those.
	 */
	private _presetTarget(id: string, preset: any) {
		return (
			this._space.components.byId?.(id) ??
			this._space.components.byType(preset?.type ?? id)?.[0] ??
			null
		);
	}

	/**
	 * Apply a chunk's preset overrides, restoring world defaults for any key
	 * that the previously-applied override set but this one does not.
	 */
	private _applyPresetOverrides(presets: Record<string, any>) {
		const ids = new Set([
			...Object.keys(presets),
			...this._appliedPresetKeys.keys(),
		]);

		for (const id of ids) {
			const override = presets[id] ?? {};
			const target = this._presetTarget(id, override);
			if (!target) continue;

			const defaults = this._presetDefaults(id, target);
			const nextKeys = new Set(Object.keys(override).filter(k => k !== "type"));

			// Keys the last chunk overrode that this one leaves alone
			const patch: Record<string, any> = {};
			for (const key of this._appliedPresetKeys.get(id) ?? []) {
				if (!nextKeys.has(key) && key in defaults) {
					patch[key] = defaults[key];
				}
			}
			for (const key of nextKeys) {
				patch[key] = override[key];
			}

			if (Object.keys(patch).length > 0) {
				target.setData(patch);
			}

			if (nextKeys.size > 0) this._appliedPresetKeys.set(id, nextKeys);
			else this._appliedPresetKeys.delete(id);
		}
	}

	/**
	 * Snapshot of a preset singleton's world-default data, captured the first
	 * time an override touches it — i.e. before any override has been applied.
	 */
	private _presetDefaults(id: string, target: any): Record<string, any> {
		let defaults = this._presetWorldDefaults.get(id);
		if (!defaults) {
			defaults = { ...(target.data ?? {}) };
			this._presetWorldDefaults.set(id, defaults);
		}
		return defaults;
	}

	/** Restore every applied override back to its world default. */
	private _restorePresetDefaults() {
		this._applyPresetOverrides({});
	}

	private _unloadChunk() {
		for (const comp of this._chunkComponents) {
			try {
				comp.destroy?.();
			}
			catch (err) {
				console.error(`Failed to destroy component:`, err);
			}
		}
		this._chunkComponents = [];
	}

	private _updateURL(key: string) {
		try {
			const params = new URLSearchParams(window.location.search);
			params.set("chunk", key);
			window.history.replaceState(null, "", `?${params.toString()}`);
		}
		catch {
			// SSR or no window
		}
	}

	// ── Static helpers ──

	static readURL(): string | null {
		try {
			return new URLSearchParams(window.location.search).get("chunk") ?? null;
		}
		catch {
			return null;
		}
	}

	static posToKey(position: Vector3) {
		return posToChunkKey(position);
	}

	/**
	 * Check if a component belongs in the static/global file.
	 * Globals + presets stay in static; they're never chunk-loaded/unloaded.
	 */
	static isGlobal(comp: any): boolean {
		return isGlobalComponent(comp);
	}

	/**
	 * Check if a component type is a preset singleton.
	 */
	static isPreset(comp: any): boolean {
		return isPresetType(comp?.type);
	}

	/**
	 * Filter components down to globals + presets (for initial load).
	 */
	static filterGlobals(components: Record<string, any>): Record<string, any> {
		return filterGlobalComponents(components);
	}

	static get CHUNK_SIZE() { return CHUNK_SIZE; }
	static get GLOBAL_TYPES() { return GLOBAL_TYPES; }
	static get PRESET_TYPES() { return PRESET_TYPES; }
}
