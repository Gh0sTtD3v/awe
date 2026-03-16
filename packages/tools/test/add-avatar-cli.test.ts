import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  pepeVrmFixture,
  publicPathFromUrl,
  runCli,
} from "./support/cli-test-helpers";

describe("add-avatar CLI", () => {
  it("adds an avatar without requiring a .vrm suffix", () => {
    const projectDir = makeTempProjectDir();
    const relativeSourcePath = path.join("avatars", "pepe-vrm.glb");

    copyFixture(
      pepeVrmFixture,
      path.join(projectDir, relativeSourcePath),
    );

    const { stdout, exitCode } = runCli([
      "add-avatar",
      relativeSourcePath,
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      url: string;
      urlCompressed: string;
      name: string;
    }>(stdout);

    expect(result.name).toBe("pepe-vrm.glb");
    expect(fs.existsSync(publicPathFromUrl(projectDir, result.url))).toBe(true);
    expect(
      fs.existsSync(publicPathFromUrl(projectDir, result.urlCompressed)),
    ).toBe(true);

    const uploadedAvatarsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_avatars.json",
    );
    const uploadedAvatars = JSON.parse(
      fs.readFileSync(uploadedAvatarsPath, "utf-8"),
    ) as Array<{
      url: string;
      urlCompressed: string;
      name: string;
    }>;

    expect(uploadedAvatars).toHaveLength(1);
    expect(uploadedAvatars[0]?.url).toBe(result.url);
    expect(uploadedAvatars[0]?.urlCompressed).toBe(result.urlCompressed);
    expect(uploadedAvatars[0]?.name).toBe(result.name);
  });

  it("honors the --name override", () => {
    const projectDir = makeTempProjectDir();
    const relativeSourcePath = path.join("avatars", "pepe-vrm.glb");

    copyFixture(
      pepeVrmFixture,
      path.join(projectDir, relativeSourcePath),
    );

    const { stdout, exitCode } = runCli([
      "add-avatar",
      relativeSourcePath,
      "--name=Pepe Hero",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      url: string;
      name: string;
    }>(stdout);

    expect(result.name).toBe("Pepe Hero");

    const uploadedAvatarsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_avatars.json",
    );
    const uploadedAvatars = JSON.parse(
      fs.readFileSync(uploadedAvatarsPath, "utf-8"),
    ) as Array<{ url: string; name: string }>;

    expect(uploadedAvatars[0]?.url).toBe(result.url);
    expect(uploadedAvatars[0]?.name).toBe("Pepe Hero");
  });
});
