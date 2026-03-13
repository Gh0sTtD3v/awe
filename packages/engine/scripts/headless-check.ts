/**
 * Headless smoke check — boots the engine in headless mode with real
 * rapier3d WASM, loads a scene, steps a few ticks, and exits.
 *
 * Run: pnpm --filter engine headless:check
 */

import fs from "node:fs";
import path from "node:path";
import { EngineHeadless } from "engine/engine-headless";
import Emitter from "engine/internal/engine-emitter";
import { EngineEvents } from "engine/internal/engine-events";

const publicDir = path.resolve(__dirname, "../../../apps/game/public");
const scenePath = path.join(publicDir, "games/shooter/data/static-scene.json");
const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf-8"));

// In the browser the baseUrl "/games/shooter" is resolved against the page
// origin.  In Node there is no origin, so we use a file:// URL pointing at
// the local public directory and shim fetch to support it.
const baseUrl = `file://${publicDir}/games/shooter`;

const _origFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  console.log(`  [fetch] ${typeof url === "string" ? url.slice(0, 120) : url}`);
  if (typeof url === "string" && url.startsWith("file://")) {
    const filePath = url.slice(7);
    if (!fs.existsSync(filePath)) {
      console.warn(`  [fetch shim] file not found: ${filePath}`);
      return new Response(null, { status: 404, statusText: "Not Found" });
    }
    const buf = fs.readFileSync(filePath);
    return new Response(buf);
  }
  return _origFetch(input, init);
};

async function main() {
  console.log("Booting engine in headless mode...");
  console.log(`Loading scene: ${scenePath}`);
  console.log(`Asset baseUrl: ${baseUrl}`);

  const engine = EngineHeadless.getInstance();
  const { space } = await engine.createSpace({
    runtime: "headless",
    game: sceneJson,
    assets: { baseUrl },
  });

  // Summarise what got loaded
  const types = new Map<string, number>();
  space.components.forEach((comp: any) => {
    const t = comp.data?.type ?? "unknown";
    types.set(t, (types.get(t) ?? 0) + 1);
  });
  console.log("Components loaded:");
  for (const [type, count] of [...types.entries()].sort()) {
    console.log(`  ${type}: ${count}`);
  }

  space.start();

  const events: string[] = [];
  Emitter.on(EngineEvents.INPUT_PROCESS, () => events.push("INPUT_PROCESS"));
  Emitter.on(EngineEvents.PHYSICS_UPDATE, () => events.push("PHYSICS_UPDATE"));
  Emitter.on(EngineEvents.AFTER_PHYSICS_UPDATE, () =>
    events.push("AFTER_PHYSICS_UPDATE"),
  );
  Emitter.on(EngineEvents.UPDATE, () => events.push("UPDATE"));
  Emitter.on(EngineEvents.LATE_UPDATE, () => events.push("LATE_UPDATE"));

  const TICKS = 10;
  for (let i = 0; i < TICKS; i++) {
    engine.tick(1 / 60);
  }
  console.log(
    `Ticked ${TICKS} frames — event order per tick: ${events.slice(0, 5).join(" → ")}`,
  );

  space.destroy();

  // Wait for async destroy to settle
  for (let i = 0; i < 20 && engine.sessionState !== "void"; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log("Headless check passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Headless check failed:", err);
  process.exit(1);
});
