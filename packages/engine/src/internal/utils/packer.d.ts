/**
 * Type declarations for packer.js
 *
 * Kept alongside the companion .js file so TypeScript has explicit types for
 * the module.
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
