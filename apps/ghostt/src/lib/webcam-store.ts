import { Store } from "@/hooks/use-store";

export type WebcamStatus =
  /** Not started, or stopped. */
  | "off"
  | "requesting"
  | "ready"
  /** The browser or the player refused the camera. */
  | "denied"
  /** No camera found, or the browser can't use one (e.g. not on https). */
  | "unavailable";

export interface WebcamState {
  status: WebcamStatus;
  /** Show the small self-view preview. */
  preview: boolean;
  /** Size of the live video, once known. */
  width: number;
  height: number;
  /** Chosen camera's label, when the browser shares it. */
  label: string;
  /** This player is a tester under debug recording (frames go to the game server while the webcam is on). */
  recording: boolean;
}

const PREVIEW_KEY = "ghostt.webcam.preview";

function savedPreview(): boolean {
  try {
    return localStorage.getItem(PREVIEW_KEY) !== "0";
  } catch {
    return true;
  }
}

export const webcamStore = new Store<WebcamState>({
  status: "off",
  preview: typeof window === "undefined" ? true : savedPreview(),
  width: 0,
  height: 0,
  label: "",
  recording: false,
});

export function setWebcamPreview(preview: boolean) {
  try {
    localStorage.setItem(PREVIEW_KEY, preview ? "1" : "0");
  } catch {
    // per-viewer convenience only
  }
  webcamStore.update({ preview });
}
