export function sanitizeFilename(filename) {
    // Separate the extension from the base filename
    const extension = filename.slice(filename.lastIndexOf('.'));
    const baseName = filename.slice(0, filename.lastIndexOf('.'));
    
    // Remove spaces and special characters from the base name
    // This regex matches any character that is not a letter, number, or underscore
    const cleanedBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Return the cleaned filename with its original extension
    return cleanedBaseName + extension;
}
