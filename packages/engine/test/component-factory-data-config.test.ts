import { ComponentFactory } from "../src/space/abstract/component-factory";

describe("ComponentFactory data config", () => {
    it("keeps subclass data configs isolated", () => {
        class FactoryA extends ComponentFactory<any> {}
        class FactoryB extends ComponentFactory<any> {}

        FactoryA.setDataConfig({
            defaultData: {
                type: "a",
                geometry: { type: "box" },
            },
            valuePaths: ["geometry"],
        });

        FactoryB.setDataConfig({
            defaultData: {
                type: "b",
                params: { walkableHeight: 2 },
            },
            valuePaths: ["params"],
        });

        expect(FactoryA.getDefaultData()).toEqual({
            type: "a",
            geometry: { type: "box" },
        });
        expect(FactoryB.getDefaultData()).toEqual({
            type: "b",
            params: { walkableHeight: 2 },
        });
        expect(FactoryA.dataConfig).not.toBe(FactoryB.dataConfig);
        expect(FactoryA.dataConfig.valuePaths).toEqual(["geometry"]);
        expect(FactoryB.dataConfig.valuePaths).toEqual(["params"]);
    });
});
