import {
  Box3,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from "three";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import type { MeshComponentData } from "./mesh-data";
import { createMeshGeometry, getMeshColliderType } from "./create-geometry";

/**
 * @internal
 *
 * Headless mesh component — geometry and collision only, no rendering.
 */
export class MeshComponentHeadless extends Component3D<MeshComponentData> {
  mesh: Mesh<BufferGeometry, MeshBasicMaterial> = null;

  /** @internal */
  protected async init() {
    this.mesh = new Mesh(
      createMeshGeometry(this.data.geometry),
      new MeshBasicMaterial(),
    );

    this.add(this.mesh);
  }

  /** @internal */
  getCollisionMesh() {
    return this.mesh;
  }

  /** @internal */
  protected _getBBoxImp(box: Box3) {
    return box.expandByObject(this.mesh);
  }

  /** @internal */
  _getCollisionInfo<T>(opts: T): T {
    const colliderType =
      (opts as any).colliderType ??
      getMeshColliderType(this.data.geometry, this.mesh.geometry);

    return super._getCollisionInfo({
      ...opts,
      colliderType,
    } as T);
  }

  /** @internal */
  onDataChange(opts: DataChangeOpts<MeshComponentData>): void {
    if (opts?.prev?.geometry !== this.data.geometry) {
      this.mesh.geometry?.dispose();
      this.mesh.geometry = createMeshGeometry(this.data.geometry);
    }
  }

  /** @internal */
  protected dispose() {
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.mesh = null;
  }
}
