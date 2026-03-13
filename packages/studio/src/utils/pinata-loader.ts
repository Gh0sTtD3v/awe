export function pinataLoader({ src, width }) {
    //

    const urlObj = new URL(src);

    const searchParams = urlObj.searchParams;

    if (!searchParams.has("img-width")) {
        searchParams.set("img-width", width || 400);
    }

    urlObj.search = searchParams.toString();

    const modifiedUrl = urlObj.toString();

    return modifiedUrl;
}
