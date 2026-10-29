import { describe, expect, it } from "vitest";
import { channelOf, zoneAt, zoneFromComponent, WORLD_CHANNEL } from "../shared/zones";

const zone = (id: string, position: object, scale: object, rotation = { x: 0, y: 0, z: 0 }) =>
  zoneFromComponent({ id, type: "chat-zone", label: id, position, scale, rotation })!;

describe("chat rooms", () => {
  it("finds the room a point is in, rotation included", () => {
    // 10 wide along x, 2 deep along z, turned 90° so it runs along z.
    const hall = zone("hall", { x: 0, y: 0, z: 0 }, { x: 10, y: 4, z: 2 }, { x: 0, y: Math.PI / 2, z: 0 });
    expect(zoneAt([hall], { x: 0, y: 0, z: 4 })?.id).toBe("hall");
    expect(zoneAt([hall], { x: 4, y: 0, z: 0 })).toBeNull();
  });

  it("picks the smallest room where rooms overlap", () => {
    const plaza = zone("plaza", { x: 0, y: 0, z: 0 }, { x: 40, y: 10, z: 40 });
    const booth = zone("booth", { x: 2, y: 0, z: 2 }, { x: 4, y: 4, z: 4 });
    expect(zoneAt([plaza, booth], { x: 2, y: 0, z: 2 })?.id).toBe("booth");
    expect(zoneAt([plaza, booth], { x: 10, y: 0, z: 10 })?.id).toBe("plaza");
  });

  it("makes channels for chat zones and token gates", () => {
    const gate = zoneFromComponent({
      id: "g1",
      type: "token-gate",
      label: "Vault",
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 2, z: 2 },
      ticker: "ROIDS",
    });
    expect(channelOf(gate)).toBe("gate:g1");
    expect(gate?.label).toBe("Vault");
    expect(channelOf(zone("lounge", { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }))).toBe("zone:lounge");
    expect(channelOf(null)).toBe(WORLD_CHANNEL);
    expect(zoneFromComponent({ id: "m", type: "model" })).toBeNull();
  });
});
