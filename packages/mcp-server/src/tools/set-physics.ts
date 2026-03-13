import { readScene, writeScene } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

const VALID_RIGIDBODY_TYPES = ["DYNAMIC", "KINEMATIC", "FIXED", "PLAYER"] as const;
const VALID_COLLIDER_TYPES = ["CUBE", "SPHERE", "CAPSULE", "CYLINDER", "MESH"] as const;

export async function setPhysics(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const componentId = args.componentId as string;
  if (!componentId) return makeError("MISSING_PARAM", "componentId is required");
  if (!("enabled" in args)) return makeError("MISSING_PARAM", "enabled is required");

  const enabled = args.enabled as boolean;

  const scene = await readScene(projectDir);
  const component = scene.components[componentId];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component '${componentId}' not found`);
  }

  if (!enabled) {
    delete component.collider;
    scene.components[componentId] = component;
    await writeScene(projectDir, scene);
    return makeSuccess(component);
  }

  const rigidbodyType = args.rigidbodyType as string | undefined;
  if (rigidbodyType && !(VALID_RIGIDBODY_TYPES as readonly string[]).includes(rigidbodyType)) {
    return makeError("INVALID_VALUE", `Invalid rigidbodyType '${rigidbodyType}'`, `Valid: ${VALID_RIGIDBODY_TYPES.join(", ")}`);
  }

  const colliderType = args.colliderType as string | undefined;
  if (colliderType && !(VALID_COLLIDER_TYPES as readonly string[]).includes(colliderType)) {
    return makeError("INVALID_VALUE", `Invalid colliderType '${colliderType}'`, `Valid: ${VALID_COLLIDER_TYPES.join(", ")}`);
  }

  const collider: Record<string, unknown> = {
    ...(component.collider ?? {}),
    ...(rigidbodyType ? { rigidbodyType } : {}),
    ...(colliderType ? { colliderType } : {}),
  };

  if ("isSensor" in args) collider.isSensor = args.isSensor;

  const finalRigidbodyType = collider.rigidbodyType as string | undefined;

  if (finalRigidbodyType === "DYNAMIC") {
    const dynamicProps: Record<string, unknown> = {
      ...((component.collider?.dynamicProps as Record<string, unknown> | undefined) ?? {}),
    };

    if ("mass" in args) dynamicProps.mass = args.mass;
    if ("friction" in args) dynamicProps.friction = args.friction;
    if ("restitution" in args) dynamicProps.restitution = args.restitution;
    if ("linearDamping" in args) dynamicProps.linearDamping = args.linearDamping;
    if ("angularDamping" in args) dynamicProps.angularDamping = args.angularDamping;

    if (Object.keys(dynamicProps).length > 0) {
      collider.dynamicProps = dynamicProps;
    }
  } else {
    delete collider.dynamicProps;
  }

  component.collider = collider as typeof component.collider;
  scene.components[componentId] = component;
  await writeScene(projectDir, scene);

  return makeSuccess(component);
}
