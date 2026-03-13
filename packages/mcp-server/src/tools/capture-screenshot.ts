import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, XYZ } from "../types.js";

export async function captureScreenshot(args: Record<string, unknown>, _projectDir: string): Promise<ToolResponse> {
  const width = (args.width as number) ?? 1280;
  const height = (args.height as number) ?? 720;
  const cameraPosition = args.cameraPosition as XYZ | undefined;
  const cameraTarget = args.cameraTarget as XYZ | undefined;

  const ports = [3000, 3001];
  let serverUrl: string | null = null;

  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}`, { method: "HEAD", signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        serverUrl = `http://localhost:${port}`;
        break;
      }
    } catch {
      // Port not available
    }
  }

  if (!serverUrl) {
    return makeError(
      "DEV_SERVER_NOT_RUNNING",
      "No game dev server detected on ports 3000 or 3001",
      "Start the game dev server with pnpm dev, then retry"
    );
  }

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
  });
  if (cameraPosition) {
    params.set("camPosX", String(cameraPosition.x));
    params.set("camPosY", String(cameraPosition.y));
    params.set("camPosZ", String(cameraPosition.z));
  }
  if (cameraTarget) {
    params.set("camTargetX", String(cameraTarget.x));
    params.set("camTargetY", String(cameraTarget.y));
    params.set("camTargetZ", String(cameraTarget.z));
  }

  try {
    const response = await fetch(`${serverUrl}/api/screenshot?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return makeError("SCREENSHOT_FAILED", `Screenshot endpoint returned ${response.status}`, "Ensure the dev server exposes a /api/screenshot endpoint");
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return makeSuccess({
      screenshot: base64,
      width,
      height,
      format: "png",
    });
  } catch (err) {
    return makeError("SCREENSHOT_FAILED", `Failed to capture screenshot: ${err}`, "Ensure the dev server exposes a /api/screenshot endpoint");
  }
}
