export type TransformConfigXYZOpt = boolean;

export type TransformConfigOpts =
  | boolean
  | {
      position?: TransformConfigXYZOpt;
      rotation?: TransformConfigXYZOpt;
      scale?: TransformConfigXYZOpt;
    };

export interface ComponentHelp {
  desc?: string;
  tip?: string;
}

export interface ComponentInfo {
  type: string;
  title: string;
  description?: string;
  kit?: string;
  help?: ComponentHelp;
  image: string;
  imageXL?: string;
  group?: string;
  studioTab?: string;
  singleton?: boolean;
  required?: boolean;
  draggable?: boolean;
  priority?: number;
  custom?: boolean;
  autoPlace?: boolean;
  transform?: TransformConfigOpts;
  is2D?: boolean;
  batchDraw?: boolean;
  kind?: "script" | undefined;
  initTimeout?: number;
  server?: boolean;
  tipNeeded?: boolean;
}
