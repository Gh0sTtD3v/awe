import Augmented from "../src/internal/events/augmented";

describe("Augmented tests", () => {
    //
    it("should pass", () => {
        expect(true).toBeTruthy();
    });

    let createCounter = () => {
        let count = 0;
        let inc = () => {
            count++;
        };
        return {
            get count() {
                return count;
            },
            inc,
        };
    };

    let emitter: Augmented;

    beforeEach(() => {
        //
        emitter = new Augmented({
            scope: "engine",
            data: { tag: "test" },
        });
    });

    it("should add/remove listeners", () => {
        //
        const l1 = () => {};

        emitter.on("test", l1);

        expect(emitter.hasListeners("test")).toBe(true);
        expect(emitter.listenerCount("test")).toBe(1);

        const l2 = () => {};
        emitter.on("test2", l2);
        expect(emitter.listenerCount("test")).toBe(1);
        expect(emitter.getEventCount()).toBe(2);

        emitter.off("test", l1);
        expect(emitter.hasListeners("test")).toBe(false);
        expect(emitter.listenerCount("test")).toBe(0);

        emitter.removeAllListeners();
        expect(emitter.getEventCount()).toBe(0);
    });

    it("should emit events", () => {
        //
        let counter = createCounter();

        emitter.on("test", counter.inc);
        emitter.emit("test");

        expect(counter.count).toBe(1);

        emitter.emit("test");
        expect(counter.count).toBe(2);

        emitter.off("test", counter.inc);
        emitter.emit("test");
        expect(counter.count).toBe(2);
    });

    it("should trap errors when emitting", () => {
        //
        let errorPayload = null;
        const l1 = () => {
            throw new Error("mock error");
        };

        const counter = createCounter();

        emitter.on("test", l1);
        emitter.on("test", counter.inc);
        emitter.onError((payload) => {
            errorPayload = payload;
        });

        emitter.emit("test");
        expect(counter.count).toBe(1);
        expect(errorPayload!.error?.message).toBe("mock error");
        expect(errorPayload!.scope).toBe(emitter._aOpts!.scope);
        expect(errorPayload!.data.tag).toBe("test");
    });

    it("should handle once listeners", () => {
        //
        let counter = createCounter();

        emitter.once("test", counter.inc);
        emitter.emit("test");
        expect(counter.count).toBe(1);

        emitter.emit("test");
        expect(counter.count).toBe(1);
    });

    it("should handle concurrent on/off calls during emit after by postponing until after current emit", () => {
        //
        let counter1 = createCounter();
        let counter2 = createCounter();

        const l1 = () => {
            counter1.inc();
            emitter.on("test", counter2.inc);
        };

        emitter.on("test", l1);
        emitter.emit("test");
        expect(counter1.count).toBe(1);
        expect(counter2.count).toBe(0);
        expect(emitter.listenerCount("test")).toBe(2);

        emitter.emit("test");
        expect(counter1.count).toBe(2);
        expect(counter2.count).toBe(1);
        expect(emitter.listenerCount("test")).toBe(2);

        // handle concurrent off
        const l2 = () => {
            emitter.off("test", counter2.inc);
        };
        emitter.on("test", l2);
        emitter.emit("test");
        expect(counter1.count).toBe(3);
        // off will take effect only after current emit; ie after counter2.inc is called
        expect(counter2.count).toBe(2);
        expect(emitter.listenerCount("test")).toBe(2);
    });
});
