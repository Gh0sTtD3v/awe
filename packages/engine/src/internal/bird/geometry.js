import {

	BufferGeometry,

	BufferAttribute

} from 'three'

export default class Geometry extends BufferGeometry {

  constructor() {

    super();

    const size = 1;

    const vertices = [
      // left wing
      0, 0, - size,
      - size, 0, 0,
      0, 0, size,
      // right wing
      0, 0, size,
      size, 0, 0,
      0, 0, - size
    ];

    const uvs = [

      0.504255, 0.028216,

      0.985024, 0.508985,

      0.504255, 0.989754,

      0.503497, 0.990385,

      0.022727, 0.509615,

      0.503497, 0.028846,

    ]

    const vertexAnimation = [

      0, 1, 0,

      0, 1, 0

    ];

    this.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    // this.setAttribute('vertexAnimation', new BufferAttribute(new Float32Array(vertexAnimation), 1));
    this.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));

    this.customAttributes = [

        {
            name: 'vertexAnimation',
            content: new BufferAttribute(new Int16Array(vertexAnimation), 1)
        }
    ]
    // this.addInstancedAttribute('offset', 4)
    // this.addInstancedAttribute('target', 3)

  }

}
