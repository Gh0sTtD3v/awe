import { PerspectiveCamera, Vector3 } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChunkManager } from "../src/space/chunk-manager";
import Camera from "../src/camera";

/** `Camera.current` runs matrix setup, so it needs a real camera. */
function withCameraAt(position: Vector3, fn: () => Promise<void>) {
	const previous = Camera.current;
	const cam = new PerspectiveCamera();
	cam.position.copy(position);
	Camera.current = cam;

	return fn().finally(() => {
		Camera.current = previous;
	});
}

/**
 * Regression coverage for portal travel racing chunk streaming.
 *
 * Travelling used to re-enable the avatar's physics whether or not the
 * destination chunk had actually loaded. When a transition was already in
 * flight the load was skipped silently, so the avatar was dropped into an
 * empty chunk with no ground and fell out of the world.
 */

const CHUNK_FILES: Record<string, any> = {
	"0_0_0": { id: "0_0_0", presets: {}, assets: {} },
	"0_0_-1": { id: "0_0_-1", presets: {}, assets: {} },
	"0_0_-3": { id: "0_0_-3", presets: {}, assets: {} },
};

function installFetch(delayMs = 0) {
	const fetchMock = vi.fn(async (url: string) => {
		const key = String(url).replace(/^.*\/chunks\//, "").replace(/\.json$/, "");

		if (delayMs) await new Promise((r) => setTimeout(r, delayMs));

		const data = CHUNK_FILES[key];
		if (!data) return { ok: false, status: 404, json: async () => null } as any;

		return { ok: true, status: 200, json: async () => data } as any;
	});

	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function makeAvatar() {
	return {
		position: new Vector3(),
		quaternion: {},
		rigidBody: {
			enabled: true,
			resetVelocities: vi.fn(),
			teleport: vi.fn(),
		},
	};
}

function makeManager(avatar: any) {
	const manager = new ChunkManager() as any;

	manager._space = {
		components: {
			byId: () => null,
			byType: (type: string) =>
				type === "avatar" && avatar ? [avatar] : [],
			create: async (entry: any) => entry,
		},
	};

	return manager;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("travelTo", () => {
	it("loads the destination chunk before restoring physics", async () => {
		installFetch();

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		await manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		expect(manager.currentKey).toBe("0_0_-3");
		expect(avatar.rigidBody.enabled).toBe(true);
		expect(avatar.rigidBody.teleport).toHaveBeenCalled();
	});

	it("still reaches the destination when a transition is already in flight", async () => {
		// The actual failure: walking into a portal starts a boundary
		// transition, then the directory UI calls travelTo before it finishes.
		installFetch(20);

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		const inFlight = manager.loadChunk("0_0_-1");
		const travel = manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		await Promise.all([inFlight, travel]);

		expect(manager.currentKey).toBe("0_0_-3");
		expect(avatar.rigidBody.enabled).toBe(true);
	});

	it("keeps physics disabled for the whole trip", async () => {
		installFetch(20);

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		const travel = manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		// Mid-flight the avatar must not be simulating, or it falls through a
		// world that hasn't streamed in.
		expect(avatar.rigidBody.enabled).toBe(false);

		await travel;
		expect(avatar.rigidBody.enabled).toBe(true);
	});

	it("suppresses camera boundary checks while travelling", async () => {
		installFetch(20);

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		const travel = manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		// The camera lags behind the avatar during a teleport; a boundary check
		// firing now would drag us back to the chunk we just left.
		manager._checkBoundary();
		await travel;

		expect(manager.currentKey).toBe("0_0_-3");
	});

	it("stays put when the destination chunk does not exist", async () => {
		installFetch();

		const avatar = makeAvatar();
		avatar.position.set(1, 2, 3);
		const manager = makeManager(avatar);

		// y below -5000 lands in a chunk that was never generated. Dropping the
		// player into an empty chunk is worse than not moving them.
		const arrived = await manager.travelTo(new Vector3(0, -60000, 0), avatar);

		expect(arrived).toBe(false);
		expect(avatar.position.toArray()).toEqual([1, 2, 3]);
		expect(avatar.rigidBody.enabled).toBe(true);
	});

	it("reports arrival when the destination loads", async () => {
		installFetch();

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		const arrived = await manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		expect(arrived).toBe(true);
		expect(avatar.position.z).toBe(-30010);
	});

	it("lands half a body height above a floor-level destination", async () => {
		installFetch();

		const avatar: any = makeAvatar();
		avatar.getDimensions = () => new Vector3(0.5, 1.8, 0.5);
		const manager = makeManager(avatar);

		await manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		// Otherwise the avatar's centre sits on the floor and it spawns
		// embedded up to the waist.
		expect(avatar.position.y).toBeCloseTo(1.0);
		expect(avatar.rigidBody.teleport).toHaveBeenCalledWith(
			expect.objectContaining({ y: 1.0 }),
			expect.anything(),
		);
	});

	it("places flush when the target cannot report its height", async () => {
		installFetch();

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		await manager.travelTo(new Vector3(0, 0.1, -30010), avatar);

		expect(avatar.position.y).toBeCloseTo(0.1);
	});

	it("does not get dragged back by a camera still in the old chunk", async () => {
		// The camera lerps behind the avatar, so for several frames after a
		// teleport it still reports the chunk we left. Boundary detection must
		// follow the avatar, or it unloads the chunk we just arrived in.
		installFetch();

		const avatar = makeAvatar();
		const manager = makeManager(avatar);

		await manager.travelTo(new Vector3(0, 0.1, -30010), avatar);
		expect(manager.currentKey).toBe("0_0_-3");

		// Camera has not caught up: it is still sitting back in 0_0_0.
		await withCameraAt(new Vector3(0, 0, 0), async () => {
			manager._checkBoundary();
			manager._checkBoundary();
			await manager._transitionPromise;

			expect(manager.currentKey).toBe("0_0_-3");
		});
	});

	it("falls back to the camera when there is no avatar, as in edit mode", async () => {
		installFetch();

		const manager = makeManager(null);

		await withCameraAt(new Vector3(0, 0, -30010), async () => {
			manager._checkBoundary();
			await manager._transitionPromise;

			expect(manager.currentKey).toBe("0_0_-3");
		});
	});
});
