import { Euler, Quaternion, Vector3 } from "three";

const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();
const _euler = new Euler();

/**
 * A component's data with world position / rotation / scale. Inside a group,
 * the saved transform is relative to the group; zones (lifts, gates, seats,
 * gravity and music zones…) need where the component really is.
 * Top-level components return their data as is.
 */
export function worldData<T extends { data: any; parentComponent?: unknown; updateWorldMatrix?: (p: boolean, c: boolean) => void; matrixWorld: { decompose: (p: Vector3, q: Quaternion, s: Vector3) => void } }>(
  component: T | null | undefined,
): any {
  if (!component) return null;
  const data = component.data;
  if (!data?.parentId || !component.parentComponent) return data;

  component.updateWorldMatrix?.(true, false);
  component.matrixWorld.decompose(_pos, _quat, _scale);
  _euler.setFromQuaternion(_quat);
  return {
    ...data,
    position: { x: _pos.x, y: _pos.y, z: _pos.z },
    rotation: { x: _euler.x, y: _euler.y, z: _euler.z },
    scale: { x: _scale.x, y: _scale.y, z: _scale.z },
  };
}
