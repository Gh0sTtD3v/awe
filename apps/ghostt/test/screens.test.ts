import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  controlScreen,
  initialScreenState,
  msUntilEnd,
  parseScreenControl,
  reconcileScreen,
  screenFromComponent,
  screenPosition,
  withDuration,
  type ScreenDef,
  type ScreenState,
} from "../shared/screens";
import { ScreenDirector } from "../server/screen-director";

const def: ScreenDef = { id: "cinema", count: 3, autoPlay: false, loop: "all", volume: 0.5 };

function ok(result: ScreenState | { error: string }): ScreenState {
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("screen playback", () => {
  it("reads screens from scene components", () => {
    expect(
      screenFromComponent({
        id: "s1",
        type: "video-screen",
        playlist: [{ url: "a.mp4" }, { url: "" }, { title: "b", url: "b.mp4" }],
        autoPlay: true,
        loop: "one",
        volume: 3,
      }),
    ).toEqual({ id: "s1", count: 2, autoPlay: true, loop: "one", volume: 1 });
    expect(screenFromComponent({ id: "v", type: "video" })).toBeNull();
  });

  it("starts idle, or on the first video with autoPlay", () => {
    expect(initialScreenState(def, 0)).toMatchObject({ index: -1, playing: false, volume: 0.5 });
    expect(initialScreenState({ ...def, autoPlay: true }, 0)).toMatchObject({ index: 0, playing: true });
  });

  it("tracks position over time, and holds it while paused", () => {
    let s = ok(controlScreen(initialScreenState(def, 0), def, { action: "select", index: 1 }, 1000));
    expect(screenPosition(s, 6000)).toBe(5);

    s = ok(controlScreen(s, def, { action: "pause" }, 6000));
    expect(screenPosition(s, 60_000)).toBe(5);

    s = ok(controlScreen(s, def, { action: "play" }, 60_000));
    expect(screenPosition(s, 62_000)).toBe(7);

    s = ok(controlScreen(s, def, { action: "seek", time: 30 }, 62_000));
    expect(screenPosition(s, 62_000)).toBe(30);
  });

  it("steps through the playlist, wrapping around", () => {
    let s = ok(controlScreen(initialScreenState(def, 0), def, { action: "next" }, 0));
    expect(s.index).toBe(0);
    s = ok(controlScreen(s, def, { action: "previous" }, 0));
    expect(s.index).toBe(2);
    s = ok(controlScreen(s, def, { action: "next" }, 0));
    expect(s.index).toBe(0);
  });

  it("refuses videos that aren't on the playlist", () => {
    const s = initialScreenState(def, 0);
    expect(controlScreen(s, def, { action: "select", index: 3 }, 0)).toHaveProperty("error");
    expect(controlScreen(s, def, { action: "seek", time: 5 }, 0)).toHaveProperty("error");
    expect(controlScreen(s, { ...def, count: 0 }, { action: "play" }, 0)).toHaveProperty("error");
  });

  it("accepts only the first plausible duration for the current video", () => {
    const s = ok(controlScreen(initialScreenState(def, 0), def, { action: "select", index: 1 }, 0));
    expect(withDuration(s, 0, 10)).toBeNull(); // another video
    expect(withDuration(s, 1, -1)).toBeNull();
    const withLength = withDuration(s, 1, 10)!;
    expect(withLength.duration).toBe(10);
    expect(withDuration(withLength, 1, 2)).toBeNull();
    expect(msUntilEnd(withLength, 4000)).toBe(6000);
    expect(msUntilEnd({ ...withLength, loop: "one" }, 4000)).toBeNull();
  });

  it("keeps going when a playlist edit leaves the video in place", () => {
    const s = ok(controlScreen(initialScreenState(def, 0), def, { action: "select", index: 2 }, 0));
    expect(reconcileScreen(s, def, 0)).toBe(s);
    expect(reconcileScreen(s, { ...def, count: 2 }, 0)).toMatchObject({ index: 0, playing: true });
    expect(reconcileScreen(s, { ...def, count: 0 }, 0)).toMatchObject({ index: -1, playing: false });
  });

  it("validates client payloads", () => {
    expect(parseScreenControl({ screenId: "a", action: "select", index: 2 })).toEqual({
      screenId: "a",
      action: "select",
      index: 2,
    });
    expect(parseScreenControl({ screenId: "a", action: "select", index: "2" })).toBeNull();
    expect(parseScreenControl({ screenId: "a", action: "loop", loop: "forever" })).toBeNull();
    expect(parseScreenControl({ screenId: "a", action: "explode" })).toBeNull();
    expect(parseScreenControl({ action: "play" })).toBeNull();
  });
});

describe("ScreenDirector", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves on to the next video when one ends, and stops with loop off", () => {
    const published: Record<string, ScreenState>[] = [];
    const director = new ScreenDirector((changed) => published.push(changed), () => Date.now());
    director.setDefs([def]);

    director.control("cinema", { action: "select", index: 2 });
    director.reportDuration("cinema", 2, 5);
    vi.advanceTimersByTime(5000);
    expect(director.get("cinema")).toMatchObject({ index: 0, playing: true, duration: 0 });

    director.reportDuration("cinema", 0, 2);
    director.control("cinema", { action: "loop", loop: "off" });
    vi.advanceTimersByTime(2000);
    expect(director.get("cinema")).toMatchObject({ index: 0, playing: false, position: 2 });

    expect(published.length).toBeGreaterThanOrEqual(5);
    director.dispose();
  });

  it("doesn't advance a video that was paused before its end", () => {
    const director = new ScreenDirector(() => {}, () => Date.now());
    director.setDefs([def]);
    director.control("cinema", { action: "select", index: 0 });
    director.reportDuration("cinema", 0, 5);
    vi.advanceTimersByTime(2000);
    director.control("cinema", { action: "pause" });
    vi.advanceTimersByTime(10_000);
    expect(director.get("cinema")).toMatchObject({ index: 0, playing: false, position: 2 });
  });

  it("drops screens removed from the scene", () => {
    const director = new ScreenDirector(() => {}, () => Date.now());
    director.setDefs([def]);
    director.setDefs([]);
    expect(director.get("cinema")).toBeNull();
    expect(director.control("cinema", { action: "play" })).toHaveProperty("error");
  });
});
