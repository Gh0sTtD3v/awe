export interface UploadOpts {
    file: Blob | string;
    id?: string;
    mimeType: string;
    isUnique?: boolean;
    overwrite?: boolean;
    transform?: string | null;
    onProgress?: (loaded: number, total?: number) => unknown;
}

export interface UploadResponse {
    url: string;
    mimeType: string;
}
