/**
 * Type declarations for fflate.js (vendored fflate v0.6.9)
 * https://github.com/101arrowz/fflate
 *
 * Kept alongside the companion .js file so TypeScript has explicit types for
 * the vendored module.
 */

export class Deflate {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Inflate {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Gzip {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Gunzip {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Zlib {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Unzlib {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class Decompress {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class AsyncDecompress {
    constructor(cb: (err: Error | null, data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class AsyncInflate {
    constructor(cb: (err: Error | null, data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class AsyncGunzip {
    constructor(cb: (err: Error | null, data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class AsyncUnzlib {
    constructor(cb: (err: Error | null, data: Uint8Array, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class DecodeUTF8 {
    constructor(cb: (data: string, final: boolean) => void);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class EncodeUTF8 {
    constructor(cb: (data: Uint8Array, final: boolean) => void);
    push(chunk: string, final?: boolean): void;
}

export class Unzip {
    constructor(cb?: (file: UnzipFile) => void);
    push(chunk: Uint8Array, final?: boolean): void;
    register(decoder: any): void;
}

export class UnzipInflate {
    constructor();
    push(data: Uint8Array, final: boolean): void;
}

export class UnzipPassThrough {
    constructor();
    push(data: Uint8Array, final: boolean): void;
}

export class Zip {
    constructor(cb?: (err: Error | null, data: Uint8Array, final: boolean) => void);
    add(file: ZipInputFile): void;
    end(): void;
}

export class ZipDeflate {
    constructor(filename: string, opts?: any);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class ZipPassThrough {
    constructor(filename: string);
    push(chunk: Uint8Array, final?: boolean): void;
}

export class AsyncZipDeflate {
    constructor(filename: string, opts?: any);
    push(chunk: Uint8Array, final?: boolean): void;
}

interface UnzipFile {
    name: string;
    compression: number;
    start(): void;
    ondata: (err: Error | null, data: Uint8Array, final: boolean) => void;
    terminate: () => void;
}

interface ZipInputFile {
    filename: string;
    size: number;
    compression: number;
}

export function deflate(data: Uint8Array, opts?: any): Uint8Array;
export function inflate(data: Uint8Array, opts?: any): Uint8Array;
export function gzip(data: Uint8Array, opts?: any): Uint8Array;
export function gunzip(data: Uint8Array, opts?: any): Uint8Array;
export function zlib(data: Uint8Array, opts?: any): Uint8Array;
export function unzlib(data: Uint8Array, opts?: any): Uint8Array;
export function decompress(data: Uint8Array, opts?: any): Uint8Array;
export function unzip(data: Uint8Array, opts?: any): any;
export function zip(data: any, opts?: any): Uint8Array;

export function strToU8(str: string, latin1?: boolean): Uint8Array;
export function strFromU8(data: Uint8Array, latin1?: boolean): string;
