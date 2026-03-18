/**
 * Type declarations for layout-bmfont-text.js
 *
 * Kept alongside the companion .js file so TypeScript has explicit types for
 * the module.
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
