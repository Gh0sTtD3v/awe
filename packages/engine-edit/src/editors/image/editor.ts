import { Component3DEditor } from "../../component-editor/ui-editor";
import { ImageComponent } from "@oncyberio/engine/space/components/image/image-component";
import { LEGACY_UpgradeScale } from "../legacy";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class ImageComponentEditor extends Component3DEditor<ImageComponent> {
    //
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            params: {
                type: "folder",
                label: "Parameters",
                children: {
                    opacity: {
                        type: "number",
                        label: "Opacity",
                        value: [this.data, "opacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    useMipMap: {
                        type: "checkbox",
                        label: "Use MipMap",
                        value: [this.data, "useMipMap"],
                    },
                    minFilter: {
                        type: "select",
                        label: "Min Filter",
                        value: [this.data, "minFilter"],
                        items: [
                            "NearestFilter",
                            "NearestMipmapNearestFilter",
                            "NearestMipmapLinearFilter",
                            "LinearFilter",
                            "LinearMipmapNearestFilter",
                            "LinearMipmapLinearFilter",
                        ],
                    },
                    magFilter: {
                        type: "select",
                        label: "Mag Filter",
                        value: [this.data, "magFilter"],
                        items: ["NearestFilter", "LinearFilter"],
                    },
                },
            },
            border: {
                type: "folder",
                label: "Border",
                children: {
                    hasBorder: {
                        type: "checkbox",
                        label: "Has Border",
                        value: [this.data, "hasBorder"],
                    },
                    borderColor: {
                        type: "color",
                        label: "Border Color",
                        value: [this.data, "borderColor"],
                        visible: () => this.data.hasBorder,
                    },
                    borderSize: {
                        type: "number",
                        label: "Border Size",
                        value: [this.data, "borderSize"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                    borderDepth: {
                        type: "number",
                        label: "Border Depth",
                        value: [this.data, "borderDepth"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                    borderOpacity: {
                        type: "number",
                        label: "Border Opacity",
                        value: [this.data, "borderOpacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                        visible: () => this.data.hasBorder,
                    },
                },
            },
            interaction: {
                type: "folder",
                label: "Interaction",
                children: {
                    actionKey: {
                        type: "select",
                        label: "Action Key",
                        value: [this.data, "actionKey"],
                        items: ["", "E", "F", "G", "I"],
                    },
                    focusDistance: {
                        type: "number",
                        label: "Interaction Distance",
                        value: [this.data, "focusDistance"],
                        min: 1,
                        max: 50,
                        step: 0.5,
                        visible: () => !!this.data.actionKey,
                    },
                },
            },
            info: {
                type: "folder",
                label: "Info",
                children: {
                    title: {
                        type: "text",
                        label: "Title",
                        value: [this.data, "title"],
                        visible: () => !!this.data.actionKey,
                    },
                    description: {
                        type: "text",
                        label: "Description",
                        value: [this.data, "description"],
                        visible: () => !!this.data.actionKey,
                    },
                    artist: {
                        type: "text",
                        label: "Artist",
                        value: [this.data, "artist"],
                        visible: () => !!this.data.actionKey,
                    },
                    infoBgColor: {
                        type: "color",
                        label: "Info BG Color",
                        value: [this.data, "infoBgColor"],
                        visible: () => !!this.data.actionKey,
                    },
                    infoTextColor: {
                        type: "color",
                        label: "Info Text Color",
                        value: [this.data, "infoTextColor"],
                        visible: () => !!this.data.actionKey,
                    },
                    infoOpacity: {
                        type: "number",
                        label: "Info Opacity",
                        value: [this.data, "infoOpacity"],
                        min: 0,
                        max: 100,
                        step: 1,
                        visible: () => !!this.data.actionKey,
                    },
                },
            },
            transform: getTransformUI(this),
        },
    };

    init() {
        //
        LEGACY_UpgradeScale(this);
    }

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}