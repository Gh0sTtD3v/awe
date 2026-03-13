import {
    PlaneGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
} from "three";

const MAX_INSTANCED_COUNT = 5;

export default class GeometryInstancer extends InstancedBufferGeometry {
    constructor(data = {}) {
        super();

        this.maxInstancedCount = data.lines;

        let geometry = new PlaneGeometry(1, 10, 1, data.divisions);

        geometry.translate(0, geometry.parameters.height / 2, 0);

        geometry.needsUpdate = true;

        if (geometry.index) {
            this.setIndex(new BufferAttribute(geometry.index.array, 1));
        }

        if (geometry.attributes.position) {
            this.setAttribute(
                "position",
                new BufferAttribute(geometry.attributes.position.array, 3),
            );
        }

        if (geometry.attributes.uv) {
            this.setAttribute(
                "uv",
                new BufferAttribute(geometry.attributes.uv.array, 2),
            );
        }

        let i = 0;

        let offsets = [];

        // let seed 	= []

        while (i < data.lines) {
            offsets.push(
               i / data.lines
            );

            i++;
        }

        this.setAttribute(
            "offset",
            new InstancedBufferAttribute(
                new Float32Array(offsets),
                1,
                false,
                1,
            ),
        );

        // debugger;
    }
}
