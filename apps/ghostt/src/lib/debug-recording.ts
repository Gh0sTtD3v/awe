/**
 * Debug recording for testers (Debug Recording permission, signed recording
 * agreement): asks for the webcam as soon as the player is known to be a
 * tester, then sends one JPEG frame to the game server every 30 seconds.
 * Frames are stored server-side only, never shown to other players.
 *
 * Recording runs only while the webcam is on; the badge in the webcam panel
 * shows it.
 */

import type { Room } from "@colyseus/sdk";
import { DEBUG_FRAME_INTERVAL_MS, DEBUG_FRAME_MESSAGE } from "../../shared/messages";
import { infoStore } from "@/lib/info-store";
import { onWebcamFrame, startWebcam, type WebcamFrame } from "@/lib/webcam-input";
import { webcamStore } from "@/lib/webcam-store";

const FRAME_WIDTH = 640;
const JPEG_QUALITY = 0.7;

export class DebugRecording {
  private enabled = false;
  private latest: WebcamFrame | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private offFrame: (() => void) | null = null;
  private offInfo: () => void;

  constructor(private room: Room<any>) {
    this.offInfo = infoStore.subscribe(() => this.sync());
    this.sync();
  }

  /** Follow the permission: it can be granted or taken away mid-session. */
  private sync() {
    const tester = !!infoStore.state.self?.permissions.includes("debug_recording");
    if (tester === this.enabled) return;
    this.enabled = tester;
    webcamStore.update({ recording: tester });

    if (tester) {
      void startWebcam();
      this.offFrame = onWebcamFrame((frame) => (this.latest = frame));
      this.timer = setInterval(() => void this.capture(), DEBUG_FRAME_INTERVAL_MS);
      // First frame shortly after the camera comes up, not 30 s later.
      setTimeout(() => void this.capture(), 3000);
    } else {
      this.stopTimers();
    }
  }

  private async capture() {
    if (!this.enabled || webcamStore.state.status !== "ready") return;
    const frame = this.latest;
    if (!frame || frame.width === 0 || frame.height === 0) return;

    const scale = Math.min(1, FRAME_WIDTH / frame.width);
    const w = Math.round(frame.width * scale);
    const h = Math.round(frame.height * scale);
    this.canvas ??= document.createElement("canvas");
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(frame.video, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => this.canvas!.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || !this.enabled) return;
    try {
      this.room.send(DEBUG_FRAME_MESSAGE, new Uint8Array(await blob.arrayBuffer()));
    } catch (error) {
      console.warn("[DebugRecording] could not send frame", error);
    }
  }

  private stopTimers() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.offFrame?.();
    this.offFrame = null;
    this.latest = null;
  }

  dispose() {
    this.offInfo();
    this.stopTimers();
    this.enabled = false;
    webcamStore.update({ recording: false });
  }
}
