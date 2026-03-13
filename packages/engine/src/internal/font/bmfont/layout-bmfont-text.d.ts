/**
 * Type declarations for layout-bmfont-text.js
 *
 * DO NOT REMOVE: This file is required for `pnpm engine:build:api` to succeed.
 * TypeScript cannot infer types from the companion .js file during declaration
 * emit, causing TS9005 errors. This .d.ts provides the necessary type information.
 */

declare class TextLayout {
  constructor(opt: any);
  update(opt: any): void;
  glyphs: any[];
  width: number;
  height: number;
  descender: number;
  ascender: number;
  xHeight: number;
  baseline: number;
  capHeight: number;
  lineHeight: number;
  linesTotal: number;
}

export default function createLayout(opt: any): TextLayout;
