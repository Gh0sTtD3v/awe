import { Engine, EnterSpaceOpts, CreateSpaceResult } from "@oncyberio/engine";

export interface LoadGameOpts {
  baseUrl: string;
}

export async function createGame(opts: LoadGameOpts): Promise<CreateSpaceResult> {
  const { baseUrl } = opts;

  const res = await fetch(`${baseUrl}/data/static-scene.json`);
  const game = (await res.json()) as EnterSpaceOpts["game"];

  const engine = Engine.getInstance();

  return engine.createSpace({
    mode: "game",
    game,
    assets: { baseUrl },
    userReady: Promise.resolve({ id: "demo", name: "Demo User" }),
  });
}
