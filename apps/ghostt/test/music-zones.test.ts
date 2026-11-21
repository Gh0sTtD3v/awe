import { describe, expect, it } from "vitest";
import { distanceOutside, musicZoneFromComponent, trackTargets, zoneGain, type MusicZoneDef } from "../shared/music-zones";

function zone(id: string, data: Record<string, unknown> = {}): MusicZoneDef {
  const def = musicZoneFromComponent({ id, type: "music-zone", url: "/assets/song.mp3", scale: { x: 8, y: 4, z: 6 }, ...data });
  if (!def) throw new Error("not a music zone");
  return def;
}

describe("music zones", () => {
  it("builds a zone from a music-zone component", () => {
    const def = zone("a", { position: { x: 1, y: 2, z: 3 }, volume: 0.5, fadeDistance: 10, loop: false, restartOnEnter: true });
    expect(def).toMatchObject({
      id: "a",
      url: "/assets/song.mp3",
      shape: "box",
      center: { x: 1, y: 2, z: 3 },
      halfSize: { x: 4, y: 2, z: 3 },
      volume: 0.5,
      fade: 10,
      loop: false,
      restartOnEnter: true,
    });
  });

  it("defaults sensibly and skips zones without music", () => {
    expect(zone("b", { volume: 7, fadeDistance: -3 })).toMatchObject({ volume: 1, fade: 0, loop: true, restartOnEnter: false });
    expect(musicZoneFromComponent({ id: "c", type: "music-zone", url: " " })).toBeNull();
    expect(musicZoneFromComponent({ id: "d", type: "lift" })).toBeNull();
  });

  it("measures the distance outside a box, rotated ones included", () => {
    const box = zone("box");
    expect(distanceOutside(box, { x: 3, y: 1, z: -2 })).toBe(0);
    expect(distanceOutside(box, { x: 7, y: 0, z: 0 })).toBeCloseTo(3);
    expect(distanceOutside(box, { x: 7, y: 0, z: 7 })).toBeCloseTo(5); // corner: hypot(3, 4)
    const turned = zone("turned", { rotation: { x: 0, y: Math.PI / 2, z: 0 } });
    // Turned 90°: 8 m wide along z now, 6 m along x.
    expect(distanceOutside(turned, { x: 0, y: 0, z: 3.9 })).toBe(0);
    expect(distanceOutside(turned, { x: 4, y: 0, z: 0 })).toBeCloseTo(1);
  });

  it("measures the distance outside a sphere (x is the diameter)", () => {
    const ball = zone("ball", { shape: "sphere", scale: { x: 20, y: 1, z: 1 } });
    expect(ball.radius).toBe(10);
    expect(distanceOutside(ball, { x: 0, y: 9, z: 0 })).toBe(0);
    expect(distanceOutside(ball, { x: 0, y: 0, z: 13 })).toBeCloseTo(3);
  });

  it("plays full volume inside and fades across the band", () => {
    const fading = zone("f", { fadeDistance: 10 });
    expect(zoneGain(fading, { x: 0, y: 0, z: 0 })).toBe(1);
    expect(zoneGain(fading, { x: 9, y: 0, z: 0 })).toBeCloseTo(0.25); // 5 m into a 10 m band: (1 - 0.5)²
    expect(zoneGain(fading, { x: 14, y: 0, z: 0 })).toBe(0);
    const hard = zone("h", { fadeDistance: 0 });
    expect(zoneGain(hard, { x: 3.9, y: 0, z: 0 })).toBe(1);
    expect(zoneGain(hard, { x: 4.1, y: 0, z: 0 })).toBe(0);
  });

  it("zones with the same file share one track: a path of touching boxes plays one continuous song", () => {
    // An L-shaped path: a long box along x, and a box along z touching its end.
    const a = zone("a", { position: { x: 0, y: 0, z: 0 }, scale: { x: 20, y: 4, z: 4 }, fadeDistance: 0, volume: 0.8 });
    const b = zone("b", { position: { x: -8, y: 0, z: 12 }, scale: { x: 4, y: 4, z: 20 }, fadeDistance: 0, volume: 0.6 });
    const other = zone("c", { url: "/assets/other.mp3", position: { x: 100, y: 0, z: 0 } });
    const zones = [a, b, other];

    const inA = trackTargets(zones, { x: 5, y: 0, z: 0 });
    expect(inA.size).toBe(2); // one entry per file, not per zone
    expect(inA.get("/assets/song.mp3")?.volume).toBeCloseTo(0.8);
    expect(inA.get("/assets/other.mp3")?.volume).toBe(0);

    // Walking into b: same track (same key), now at b's volume.
    expect(trackTargets(zones, { x: -8, y: 0, z: 15 }).get("/assets/song.mp3")?.volume).toBeCloseTo(0.6);
    // Where they overlap the loudest wins; volumes don't add up.
    expect(trackTargets(zones, { x: -8, y: 0, z: 1.5 }).get("/assets/song.mp3")?.volume).toBeCloseTo(0.8);
    // Off the path: silent.
    expect(trackTargets(zones, { x: 5, y: 0, z: 10 }).get("/assets/song.mp3")?.volume).toBe(0);
    // No listener: everything silent.
    expect(trackTargets(zones, null).get("/assets/song.mp3")?.volume).toBe(0);
  });
});
