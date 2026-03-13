import { describe, it, expect } from "vitest";
import { toKebabCase } from "../index";

describe("toKebabCase", () => {
  it("converts camelCase to kebab-case", () => {
    expect(toKebabCase("myGame")).toBe("my-game");
  });

  it("converts PascalCase to kebab-case", () => {
    expect(toKebabCase("MyGame")).toBe("my-game");
  });

  it("converts spaces to hyphens", () => {
    expect(toKebabCase("my game")).toBe("my-game");
  });

  it("converts underscores to hyphens", () => {
    expect(toKebabCase("my_game")).toBe("my-game");
  });

  it("lowercases all characters", () => {
    expect(toKebabCase("MY-GAME")).toBe("my-game");
  });

  it("handles already kebab-case strings", () => {
    expect(toKebabCase("my-game")).toBe("my-game");
  });

  it("handles single word", () => {
    expect(toKebabCase("game")).toBe("game");
  });

  it("handles multiple consecutive capitals", () => {
    expect(toKebabCase("myHTTPServer")).toBe("my-httpserver");
  });

  it("handles mixed separators", () => {
    expect(toKebabCase("my_game Project")).toBe("my-game-project");
  });
});
