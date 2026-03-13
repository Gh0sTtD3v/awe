// Base utilities and types
export {
  BaseCameraRig,
  calculateRotationConversion,
  applyAxisDampening,
  MIN_POLAR_ANGLE,
  MAX_POLAR_ANGLE,
  SENSITIVITY_DIVISOR,
  MIN_RATIO_TO_ROTATE_Y,
} from "./base-camera-rig";
export type {
  BaseCameraRigConfig,
  RotationConversion,
  AxisDampeningResult,
} from "./base-camera-rig";

// First-person camera rig
export { FirstPersonCameraRig } from "./first-person-camera-rig";
export type {
  FirstPersonCameraRigConfig,
  FirstPersonCameraRigState,
} from "./first-person-camera-rig";

// Third-person camera rig
export { ThirdPersonCameraRig } from "./third-person-camera-rig";
export type {
  ThirdPersonCameraRigConfig,
  ThirdPersonCameraRigState,
} from "./third-person-camera-rig";

// Fly camera rig
export { FlyCameraRig } from "./fly-camera-rig";
export type {
  FlyCameraRigConfig,
  FlyCameraActions,
  FlyCameraRigState,
} from "./fly-camera-rig";

// Follow camera rig (generalized from FixedCameraRig)
export { FollowCameraRig } from "./follow-camera-rig";
export type {
  FollowCameraRigConfig,
  FollowCameraRigState,
} from "./follow-camera-rig";

// Union type for any camera rig
export type AnyCameraRig =
  | import("./first-person-camera-rig").FirstPersonCameraRig
  | import("./third-person-camera-rig").ThirdPersonCameraRig
  | import("./fly-camera-rig").FlyCameraRig
  | import("./follow-camera-rig").FollowCameraRig;

// Union type for any camera rig state
export type AnyCameraRigState =
  | import("./first-person-camera-rig").FirstPersonCameraRigState
  | import("./third-person-camera-rig").ThirdPersonCameraRigState
  | import("./fly-camera-rig").FlyCameraRigState
  | import("./follow-camera-rig").FollowCameraRigState;
