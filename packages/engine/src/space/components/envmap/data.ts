import { Assets } from "../../../internal/resources/assets";

export const envmaps = {
    studio: {
        id: "studio",
        name: "Studio",
        image: Assets.envmap.studioImg,
        path: Assets.envmap.studio,
        format: ".hdr",
    },
    vig: {
        id: "vig",
        name: "Village",
        format: "hdr",
        image: Assets.envmap.vigImg,
        path: Assets.envmap.vig,
    },
    fields: {
        id: "fields",
        name: "Fields",
        image: Assets.envmap.fieldsImg,
        path: Assets.envmap.fields,
        format: ".hdr",
    },
    // custom: {
    //     id: "custom",
    //     name: "Custom",
    // },
};

export const envmapPresets = [
    {
        name: "Scene",
        image: "/components/envmap.png",
        data: {
            options: { type: "scene" },
        },
    },
    {
        name: "Studio",
        image: envmaps.studio.image,
        data: {
            options: { type: "image", imageId: "studio" },
        },
    },
    {
        name: "Fields",
        image: envmaps.fields.image,
        data: {
            options: { type: "image", imageId: "fields" },
        },
    },
    {
        name: "Village",
        image: envmaps.vig.image,
        data: {
            options: { type: "image", imageId: "vig" },
        },
    },
];
