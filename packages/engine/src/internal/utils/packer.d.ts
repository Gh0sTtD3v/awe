/**
 * Type declarations for packer.js
 *
 * DO NOT REMOVE: This file is required for `pnpm engine:build:api` to succeed.
 * TypeScript cannot infer types from the companion .js file during declaration
 * emit, causing TS9005 errors. This .d.ts provides the necessary type information.
 */

declare class Packer {
    constructor(w: number, h: number);
    init(w: number, h: number): void;
    fit(blocks: any[]): void;
    findNode(root: any, w: number, h: number): any;
    splitNode(node: any, w: number, h: number): any;
    growNode(w: number, h: number): any;
    growRight(w: number, h: number): any;
    growDown(w: number, h: number): any;
}

export default Packer;
