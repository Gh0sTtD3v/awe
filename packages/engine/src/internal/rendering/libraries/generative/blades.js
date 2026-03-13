import { BufferGeometry, BufferAttribute, Vector3, Mesh, MeshBasicMaterial } from 'three';

const BLADE_COUNT = 180;
const VERTEX_COUNT = 3;
const BLADE_WIDTH = 0.13;
const BLADE_HEIGHT = 1.0;
const BLADE_HEIGHT_VARIATION = 0.6;
const BLADE_DISTANCE = 2.5

//WELL512
export function RandomNumberGenerator(seed) {
    const state = new Array(16);
    let index = 0;

    // Simple seeding: fill state with seed values
    for (let i = 0; i < 16; i++) {
        state[i] = (seed + i) >>> 0;
    }

    return function() {
        const a = state[index];
        const c = state[(index + 13) & 15];
        const b = a ^ c ^ (a << 16) ^ (c << 15);
        const d = (a & 0xFFFFFFF) ^ ((a << 8) ^ b >>> 13);

        const e = state[(index + 9) & 15] ^ (b & 0xFFFFFFF);
        const f = e ^ (e << 4);
        const g = state[index] = d ^ (d << 18) ^ (f >>> 11) ^ (f & 0xFFFFFDFF) ^ (d & 0xFFFFFFF) ^ ((d << 8) & 0xFFFFFF00) ^ (f << 7) & 0x00FFFFF8 ^ (d >>> 14) ^ ((f >>> 11) & 0xFFE00000) ^ (d >>> 18);

        index = (index + 15) & 15;
        return (g >>> 0) / 4294967296.0; // Ensure the result is treated as unsigned
    };
}

const factor = 0.5

const DEFAULT_OPTS = {

    colors : [ [1.0 * factor ,0.427* factor,0.078* factor], [0.075* factor,0.486* factor,0.071 * factor], [0.071 * factor,0.522 * factor,0.067 * factor], [0.145 * factor,0.545 * factor,0.031 * factor]]
}

class BladeFactory {

    constructor(){

    }

    get( opts = {} ){

        this.opts = Object.assign( {}, DEFAULT_OPTS, opts )

        const geo = this.generateBlades(60, BLADE_WIDTH * 3 )

        geo.computeBoundingBox()

        geo.lod = [this.generateBlades(25, BLADE_WIDTH * 6 ), this.generateBlades(15, BLADE_WIDTH * 10 ), this.generateBlades( 5, BLADE_WIDTH * 14 )]

        return new Mesh( geo, new MeshBasicMaterial({color: 0x003300}) )  
    }
  
    generateBlades( count = BLADE_COUNT, width = BLADE_WIDTH){

       this.rdn = RandomNumberGenerator(439)

        const positions = [];
        const indices = [];
        const colors = [];
        const uvs = []

        for (let i = 0; i < count; i++) {

            var center = this.getRandomPointInsideCircle(BLADE_DISTANCE)

            const blade = this.generateBlade(center, i * VERTEX_COUNT, width);
            blade.verts.forEach(vert => {
              positions.push(...vert.pos);
              colors.push(...vert.color);
              uvs.push(...vert.uv);
            });
            blade.indices.forEach(indice => indices.push(indice));
        }

        const geom = new BufferGeometry();
        geom.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
        geom.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
        geom.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
        geom.setIndex(indices);
        geom.computeVertexNormals();

        return geom 
    }

    getRandomPointInsideCircle(R) {
      const theta = 2 * Math.PI *  this.rdn() ;   // Random angle in [0, 2π]
      const r = R * Math.sqrt( this.rdn() );      // Random distance in [0, R], using sqrt to ensure uniform distribution
  
      const x =  r * Math.cos(theta);
      const y =  r * Math.sin(theta);
  
      return new Vector3(x, 0, y);
  }

    generateBlade (center, vArrOffset, width) {

       
        const MID_WIDTH = width * 0.5 + (this.rdn() - 0.5) * 0.25;
        const TIP_OFFSET = 0.3;
        const height = BLADE_HEIGHT + ( this.rdn()  * BLADE_HEIGHT_VARIATION);

        const v = new Vector3().copy(center).normalize();

        const yaw = Math.atan2(v.x, v.z);
        const yawUnitVec = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
        const tipBend =  this.rdn()  * Math.PI * 2;
        const tipBendUnitVec = new Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
      
        // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
        const bl = new Vector3().addVectors(center, new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        const br = new Vector3().addVectors(center, new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        // const tl = new Vector3().addVectors(center, new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
        // const tr = new Vector3().addVectors(center, new Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
        const tc = new Vector3().addVectors(center, new Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
      
        // tl.y += height / 2;
        // tr.y += height / 2;
        tc.y += height;


      
        const verts = [
          { pos: bl.toArray(), color:  this.opts.colors[ Math.floor( this.rdn() * this.opts.colors.length ) ], uv: [0, 0] },
          { pos: br.toArray(), color:  this.opts.colors[ Math.floor( this.rdn() * this.opts.colors.length ) ], uv: [1, 0] },
          // { pos: tr.toArray(), color:  this.opts.colors[ Math.floor( this.rdn() * this.opts.colors.length ) ], uv: [1, 0.5] },
          // { pos: tl.toArray(), color:  this.opts.colors[ Math.floor( this.rdn() * this.opts.colors.length ) ], uv: [0, 0.5] },
          { pos: tc.toArray(), color:  this.opts.colors[ Math.floor( this.rdn() * this.opts.colors.length ) ], uv: [0.5, 1] }
        ];
      
        const indices = [
          vArrOffset,
          vArrOffset + 1,
          vArrOffset + 2,
          // vArrOffset + 2,
          // vArrOffset + 4,
          // vArrOffset + 3,
          // vArrOffset + 3,
          // vArrOffset,
          // vArrOffset + 2
        ];
      
        return { verts, indices };
      }

}

export default new BladeFactory()