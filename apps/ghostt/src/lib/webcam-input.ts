/**
 * Webcam input source, the base for future motion control (pose / hand /
 * face tracking).
 *
 * It only owns the camera: start/stop, one shared <video> element, and a
 * per-frame hook. Nothing leaves the browser — frames are never sent to the
 * server or other players. A tracker plugs in with {@link onWebcamFrame} and
 * reads the video (e.g. MediaPipe's `detectForVideo(video, timestamp)`).
 */

import { webcamStore } from "@/lib/webcam-store";

/** One video frame, handed to every subscriber. */
export interface WebcamFrame {
  video: HTMLVideoElement;
  /** Presentation time in ms (performance.now() clock). */
  timestamp: number;
  width: number;
  height: number;
}

export type WebcamFrameListener = (frame: WebcamFrame) => void;

/** Modest resolution: plenty for body tracking, light on CPU. */
const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
  },
};

let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let frameHandle = 0;
let usingVideoFrameCallback = false;
const listeners = new Set<WebcamFrameListener>();

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function emit(timestamp: number) {
  if (!video || video.readyState < 2) return;
  const frame: WebcamFrame = {
    video,
    timestamp,
    width: video.videoWidth,
    height: video.videoHeight,
  };
  for (const listener of listeners) {
    try {
      listener(frame);
    } catch (error) {
      console.error("[Webcam] frame listener failed", error);
    }
  }
}

/** Calls listeners once per new camera frame (or per animation frame as a fallback). */
function startFrameLoop() {
  const v = video as VideoWithFrameCallback | null;
  if (!v) return;
  usingVideoFrameCallback = typeof v.requestVideoFrameCallback === "function";

  if (usingVideoFrameCallback) {
    const tick = (now: number) => {
      emit(now);
      if (video === v) frameHandle = v.requestVideoFrameCallback!(tick);
    };
    frameHandle = v.requestVideoFrameCallback!(tick);
  } else {
    const tick = (now: number) => {
      emit(now);
      if (video === v) frameHandle = requestAnimationFrame(tick);
    };
    frameHandle = requestAnimationFrame(tick);
  }
}

function stopFrameLoop() {
  const v = video as VideoWithFrameCallback | null;
  if (!frameHandle) return;
  if (usingVideoFrameCallback) v?.cancelVideoFrameCallback?.(frameHandle);
  else cancelAnimationFrame(frameHandle);
  frameHandle = 0;
}

/** Ask for the camera and start streaming. Safe to call again while running. */
export async function startWebcam(): Promise<boolean> {
  if (stream) return true;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    webcamStore.update({ status: "unavailable" });
    return false;
  }

  webcamStore.update({ status: "requesting" });
  try {
    stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  } catch (error) {
    const name = (error as DOMException)?.name;
    const denied = name === "NotAllowedError" || name === "SecurityError";
    webcamStore.update({ status: denied ? "denied" : "unavailable" });
    stream = null;
    return false;
  }

  video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    // Autoplay of a muted stream is allowed; ignore odd browsers.
  }

  const track = stream.getVideoTracks()[0];
  // The camera can go away (unplugged, permission revoked).
  track?.addEventListener("ended", () => stopWebcam());

  webcamStore.update({
    status: "ready",
    width: video.videoWidth,
    height: video.videoHeight,
    label: track?.label ?? "",
  });
  startFrameLoop();
  return true;
}

/** Release the camera (the browser's camera light goes off). */
export function stopWebcam(): void {
  stopFrameLoop();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video) {
    video.srcObject = null;
    video = null;
  }
  webcamStore.update({ status: "off", width: 0, height: 0, label: "" });
}

/** The live camera stream, for a preview element. Null when off. */
export function getWebcamStream(): MediaStream | null {
  return stream;
}

/**
 * Subscribe to camera frames — the hook for a motion tracker. Returns an
 * unsubscribe function. Listeners only run while the webcam is on.
 */
export function onWebcamFrame(listener: WebcamFrameListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
