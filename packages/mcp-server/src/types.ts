export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface SceneComponent {
  id: string;
  name: string;
  type: string;
  position?: XYZ;
  rotation?: XYZ;
  scale?: XYZ;
  parentId?: string;
  data?: Record<string, unknown>;
  collider?: ColliderConfig;
  script?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ColliderConfig {
  rigidbodyType?: "DYNAMIC" | "KINEMATIC" | "FIXED" | "PLAYER";
  colliderType?: "CUBE" | "SPHERE" | "CAPSULE" | "CYLINDER" | "MESH";
  isSensor?: boolean;
  dynamicProps?: {
    mass?: number;
    friction?: number;
    restitution?: number;
    linearDamping?: number;
    angularDamping?: number;
  };
}

export interface SceneData {
  id?: string;
  creatorId?: string;
  editors?: string[];
  components: Record<string, SceneComponent>;
  params?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
}

export interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export const VALID_COMPONENT_TYPES = [
  "mesh", "model", "avatar", "text", "image", "video", "audio",
  "light", "terrain", "water", "grass", "fog", "background", "envmap",
  "spawn", "navmesh", "group", "quarks", "interaction", "dialog",
  "destination", "spline", "iframe", "reflector", "postprocessing", "rain",
  "cloud", "bird", "dust", "wave", "godray", "impact", "object",
] as const;

export type ComponentType = typeof VALID_COMPONENT_TYPES[number];
