import { WEB_WORKER_SUPPORT } from "../../../constants";

import baker from "./worker/index";

import BakerAbstract from "./abstract";

import { computeVrmBBox } from "../../vrm-bbox";

class VRMBuilder {
    async build(res, url) {
        if (res == null) {
            debugger; 
        }

        const IS_VRM = res.userData?.vrm != null;

        if (IS_VRM) {
            // VRMUtils.removeUnnecessaryVertices(res.scene);
            //VRMUtils.removeUnnecessaryJoints(res.scene);
        }

        this.setLocalScale(res);

        if (WEB_WORKER_SUPPORT) {
            if (this.webworkerBaker == null) {
                this.webworkerBaker = baker;
            }

            const globalMeta = await this.webworkerBaker.prepare(url, res);

            res.userData.vrm.globalMeta = globalMeta;

            if (this.bakerAbstract == null) {
                this.bakerAbstract = new BakerAbstract();
            }

            this.bakerAbstract.updateSkeleton(res.scene, globalMeta.boneMap);
        } else {
        }

        res.userData.name = url;

        return res;
    }

    setLocalScale(res) {
        const { baseScaleRatio, vrmBBox } = computeVrmBBox(res.scene);

        res.userData.vrm.baseScaleRatio = baseScaleRatio;
        res.userData.vrm.vbbox = vrmBBox;
    }
}

export default new VRMBuilder();
