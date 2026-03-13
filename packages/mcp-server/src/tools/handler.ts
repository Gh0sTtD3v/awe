import type { ToolResponse } from "../types.js";
import { makeError } from "../utils/errors.js";
import { getScene } from "./get-scene.js";
import { listComponents } from "./list-components.js";
import { getComponent } from "./get-component.js";
import { addComponent } from "./add-component.js";
import { updateComponent } from "./update-component.js";
import { deleteComponent } from "./delete-component.js";
import { duplicateComponent } from "./duplicate-component.js";
import { moveComponent } from "./move-component.js";
import { listModels } from "./list-models.js";
import { listAvatars } from "./list-avatars.js";
import { listUploads } from "./list-uploads.js";
import { searchAssets } from "./search-assets.js";
import { uploadAsset } from "./upload-asset.js";
import { addModelToScene } from "./add-model-to-scene.js";
import { addAvatarToScene } from "./add-avatar-to-scene.js";
import { setPhysics } from "./set-physics.js";
import { listPhysicsComponents } from "./list-physics-components.js";
import { getAnimations } from "./get-animations.js";
import { addAnimation } from "./add-animation.js";
import { getProjectInfo } from "./get-project-info.js";
import { validateScene } from "./validate-scene.js";
import { groupComponents } from "./group-components.js";
import { batchUpdate } from "./batch-update.js";
import { setLighting } from "./set-lighting.js";
import { setEnvironment } from "./set-environment.js";
import { getComponentSchema } from "./get-component-schema.js";
import { setSpawn } from "./set-spawn.js";
import { captureScreenshot } from "./capture-screenshot.js";
import { validateComponentData } from "./validate-component-data.js";
import { optimizeModel } from "./optimize-model.js";
import { optimizeVrm } from "./optimize-vrm.js";
import { bakeAnimation } from "./bake-animation.js";

type ToolHandler = (args: Record<string, unknown>, projectDir: string) => Promise<ToolResponse>;

const handlers: Record<string, ToolHandler> = {
  get_scene: getScene,
  list_components: listComponents,
  get_component: getComponent,
  add_component: addComponent,
  update_component: updateComponent,
  delete_component: deleteComponent,
  duplicate_component: duplicateComponent,
  move_component: moveComponent,
  list_models: listModels,
  list_avatars: listAvatars,
  list_uploads: listUploads,
  search_assets: searchAssets,
  upload_asset: uploadAsset,
  add_model_to_scene: addModelToScene,
  add_avatar_to_scene: addAvatarToScene,
  set_physics: setPhysics,
  list_physics_components: listPhysicsComponents,
  get_animations: getAnimations,
  add_animation: addAnimation,
  get_project_info: getProjectInfo,
  validate_scene: validateScene,
  group_components: groupComponents,
  batch_update: batchUpdate,
  set_lighting: setLighting,
  set_environment: setEnvironment,
  get_component_schema: getComponentSchema,
  set_spawn: setSpawn,
  capture_screenshot: captureScreenshot,
  validate_component_data: validateComponentData,
  optimize_model: optimizeModel,
  optimize_vrm: optimizeVrm,
  bake_animation: bakeAnimation,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  projectDir: string
): Promise<ToolResponse> {
  const debug = process.env.AWE_MCP_DEBUG === "1";

  if (debug) {
    console.error(`\n[MCP] ← ${name}`, JSON.stringify(args, null, 2));
  }

  const handler = handlers[name];
  if (!handler) {
    return makeError("UNKNOWN_TOOL", `Unknown tool: ${name}`, `Available tools: ${Object.keys(handlers).join(", ")}`);
  }

  const start = Date.now();
  const result = await handler(args, projectDir);

  if (debug) {
    console.error(`[MCP] → ${name} (${Date.now() - start}ms)`, JSON.stringify(result, null, 2).slice(0, 500));
  }

  return result;
}
