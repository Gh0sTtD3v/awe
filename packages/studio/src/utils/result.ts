

export type Result<T> =
    | { success: true; value: T }
    | { success: false; error: string };

export function Success<T>(value: T): Result<T> {
    return { success: true as const, value };
}

export function Failure(error: string): Result<any> {
    return { success: false as const, error };
}