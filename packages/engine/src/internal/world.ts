import type { RuntimeProfile } from "../@types/enter-space-opts";
import type { SpaceOpts } from "../@types/space-opts";
import type { Space } from "../space/space";

export interface WorldAdapter {
  runtime: RuntimeProfile;
  preload(): Promise<void>;
  showIntro?(): Promise<void>;
  hideIntro?(): Promise<void>;
  createSpace(opts: SpaceOpts): Promise<Space>;
  destroyCurrentSpace(): Promise<void>;
  dispose(): Promise<void>;
  play(): void;
  pause(): void;
  readonly isPlaying: boolean;
  resize(opts: { w: number; h: number }): void;
}
