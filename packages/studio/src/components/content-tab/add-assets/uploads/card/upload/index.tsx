import React, { useState } from "react";
import { getAssetData } from "../../../../../../utils/mime-utils";
import { classes } from "../../../../../../utils/classes";
import { UserAssetUpload } from "../../../../../../types/user-upload";
import { AssetCard } from "../../../../../asset-card";
import { getPreviewUrl } from "../../../../../../services/uploader/utils";
import { useEditorService } from "../../../../../../contexts/editor-service-context";
import { useComponentAddHandler } from "../../../../../../hooks/use-component-add-handler";
import { UploadSettings } from "../upload-settings";
import { useContextualTip } from "../../../../../../hooks/use-contextual-tip";
import { ClientUserUploadsService as UploadService } from "../../../../../../services/client-user-uploads-service";

export function UploadCard({
  data,
  mutate,
}: {
  data: UserAssetUpload;
  mutate: () => void;
}) {
  //
  const { url, name: _name, hash, mimeType } = data;

  const [error, setError] = useState(null);
  const [onSettings, setOnSettings] = useState(false);

  const { editor } = useEditorService();

  const { contextualTipContent } = useContextualTip();

  const previewUrl = getPreviewUrl(url, mimeType);

  const handler = useComponentAddHandler(getAssetData);

  const handleNameEdit = async (e) => {
    try {
      const name = e.target.value;

      if (!name) return;

      await UploadService.updateUpload(hash, {
        name,
      });

      mutate();
    } catch (error) {
      setError("Failed to edit name, Please try again later.");
    }
  };

  const handleRemove = async () => {
    //
    try {
      await UploadService.deleteUploads([hash]);

      mutate();
    } catch (error) {
      setError("Failed to delete file, Please try again later.");
    }
  };

  const handleOptimizeAsset = async () => {};

  //   const handleOptimizeAsset = async (optimiseParam, optimEnabled) => {
  //     //
  //     try {
  //       const asset: OOAsset = {
  //         type: "model",
  //         url: data.url,
  //         mime_type: data.mimeType,
  //         hash: hash,
  //       };

  //       const id = editor.getcompressionOptionsId(optimiseParam);

  //       let payload: any = {
  //         optimiseParam,
  //         optimEnabled,
  //       };

  //       const key = id == "" ? "weld_draco_meshopt" : id;

  //       const has_default_optim =
  //         Object.keys(data?.weld_draco_meshopt || {}).length > 0;

  //       if (id == "" && !has_default_optim) {
  //         //
  //         payload.weld_draco_meshopt = data.d_optimized_files;
  //       } else if (data[key]) {
  //         payload.d_optimized_files = data[key];
  //       } else {
  //         //
  //         const { propertyId, optimized } = await editor.optimizeModelAsset(
  //           asset,
  //           optimiseParam
  //         );

  //         payload[propertyId] = optimized;

  //         if (!has_default_optim) {
  //           payload.weld_draco_meshopt = data.d_optimized_files;
  //         }

  //         payload.d_optimized_files = optimized;
  //       }

  //       await UploadService.updateUpload({
  //         hash,
  //         data: payload,
  //       });

  //       mutate();
  //     } catch (error) {
  //       setError("Failed to save geometry optimization, Please try again later.");
  //     }
  //   };

  const handleDrag = (e: React.DragEvent) => {
    //
    handler.handleDrag(e, data);
  };

  const handleClick = () => {
    //
    handler.handleAdd(data);
  };

  const handleSettings = () => {
    setOnSettings(!onSettings);
  };

  return (
    <AssetCard
      display="square"
      title={data.name}
      image={previewUrl}
      //onDrag={handleDrag}
      onClick={handleClick}
      onRemove={handleRemove}
      onEditName={handleNameEdit}
      onSettings={handleSettings}
      tip={onSettings}
      showTip={onSettings}
      onMouseLeave={(e) => {
        // if (!e.relatedTarget?.classList?.contains("contextual-tip")) {
        //     setOnSettings(false);
        // }
      }}
      className={classes(onSettings && "!z-[13]")}
      closeTip={() => {
        setOnSettings(false);
      }}
      interactiveTip={onSettings ? true : false}
    >
      {onSettings && (
        <UploadSettings
          data={data}
          optimize3DModel={handleOptimizeAsset}
          onClose={() => {
            setOnSettings(false);
          }}
        />
      )}
    </AssetCard>
  );
}
