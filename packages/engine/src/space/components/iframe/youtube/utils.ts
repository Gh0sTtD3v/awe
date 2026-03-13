export function extractYTVideoId(url: string): string | null {
    if (!url) return null;

    // Clean the URL
    url = url.trim();

    // Regular expression patterns for different YouTube URL formats
    const patterns = {
        // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
        // With additional parameters: https://www.youtube.com/watch?v=VIDEO_ID&feature=featured
        standard:
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^?&\/\n\r]{11})/,

        // Short URLs: https://youtu.be/VIDEO_ID
        short: /youtu\.be\/([^?&\/\n\r]{11})/,

        // Embed URLs: https://www.youtube.com/embed/VIDEO_ID
        embed: /youtube\.com\/embed\/([^?&\/\n\r]{11})/,

        // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
        mobile: /m\.youtube\.com\/watch\?v=([^?&\/\n\r]{11})/,

        // Shorts URLs: https://youtube.com/shorts/VIDEO_ID
        shorts: /youtube\.com\/shorts\/([^?&\/\n\r]{11})/,
    };

    // Try each pattern
    for (const pattern of Object.values(patterns)) {
        const match = url.match(pattern);
        if (match && match[1]) {
            // Validate video ID length (should be exactly 11 characters)
            if (match[1].length === 11) {
                return match[1];
            }
        }
    }

    return null;
}
