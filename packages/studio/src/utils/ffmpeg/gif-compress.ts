import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegRef = null;

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

const haxHexMap = new Map();

export async function gifCompress(gifFile, haxHex) {
    // Create a new FFmpeg instance

    if (haxHexMap.has(haxHex)) {
        return haxHexMap.get(haxHex);
    }

    if (!ffmpegRef) {
        ffmpegRef = new FFmpeg();

        await ffmpegRef.load({
            coreURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.js`,
                "text/javascript"
            ),
            wasmURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                "application/wasm"
            ),
        });
    }

    await ffmpegRef.writeFile(`${haxHex}.gif`, await fetchFile(gifFile));

    await ffmpegRef.exec(["-i", `${haxHex}.gif`, `${haxHex}.mp4`]);

    const data = await ffmpegRef.readFile(`${haxHex}.mp4`);

    await ffmpegRef.deleteFile(`${haxHex}.gif`);

    await ffmpegRef.deleteFile(`${haxHex}.mp4`);

    const url = new File([data.buffer], `${haxHex}.mp4`, {
        type: "video/mp4",
    });

    haxHexMap.set(haxHex, url);

    return url;
}
