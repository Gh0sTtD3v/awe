import { convertConfigUnits } from "../src/space/components/navmesh/common";

describe("Navmesh config conversion", () => {
    it("falls back to default params when config is omitted", () => {
        const config = convertConfigUnits();

        expect(config.walkableHeight).toBe(10);
        expect(config.walkableClimb).toBe(2);
        expect(config.walkableRadius).toBe(3);
        expect(config.maxEdgeLen).toBe(100);
        expect(config.walkableSlopeAngle).toBe(45);
        expect(config.tileSize).toBe(32);
    });

    it("uses defaults for omitted fields while preserving overrides", () => {
        const config = convertConfigUnits({
            walkableHeight: 3,
            ch: 0.5,
            walkableRadius: 0.8,
            cs: 0.4,
        });

        expect(config.walkableHeight).toBe(6);
        expect(config.walkableClimb).toBe(1);
        expect(config.walkableRadius).toBe(2);
        expect(config.maxEdgeLen).toBe(50);
    });
});
