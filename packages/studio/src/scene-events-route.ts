import {
  getCurrentSceneRevision,
  subscribeToSceneChanges,
} from "./server/scene-watch-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function encodeSseEvent(event: string, data: unknown) {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function GET(request: Request) {
  let cleanup = () => {};

  const stream = new ReadableStream({
    start: async (controller) => {
      const initialRevision = await getCurrentSceneRevision();

      controller.enqueue(encodeSseEvent("ready", initialRevision));

      const unsubscribe = await subscribeToSceneChanges((revision) => {
        controller.enqueue(encodeSseEvent("scene-change", revision));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encodeSseEvent("ping", { ok: true }));
      }, 30000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();

        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel: () => {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
