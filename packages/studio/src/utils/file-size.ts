/**
 * Utilities for handling file size limits from environment variables
 */

/**
 * Get the maximum file size in bytes from environment variable
 * @returns Max file size in bytes (defaults to 30MB)
 */
export function getMaxFileSizeBytes(): number {
  const mb = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "30", 10);
  return mb * 1024 * 1024;
}
