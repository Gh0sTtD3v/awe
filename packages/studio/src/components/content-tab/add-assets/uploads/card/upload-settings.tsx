import { useState } from "react";
import { classes } from "../../../../../utils/classes";
import SpriteIcon from "../../../../../ui/sprite";
import ButtonPill from "../../../../../ui/button-pill";
import { UserAssetUpload } from "../../../../../types/user-upload";
import { InputToggle } from "../../../../../ui/inputs/input-toggle";
import { InputCheckbox } from "../../../../../ui/inputs/input-checkbox";
import { LoadingSpinner } from "../../../../../ui/loading-spinner";

type UploadSettings = {
  data: UserAssetUpload;
  optimize3DModel: (compressionOptions: any, optimEnabled: boolean) => void;
  onClose: () => void;
};

export function UploadSettings({
  data,
  optimize3DModel,
  onClose,
}: UploadSettings) {
  //

  const [loading, setLoading] = useState(false);

  const [optimEnabled, setOptimEnabled] = useState(data?.optimEnabled ?? true);

  const fetchedOptimiseParam = data?.optimiseParam ?? {
    useWeld: true,
    useDraco: true,
    useMeshOpt: true,
  };

  const [optimiseParam, setOptimizeParam] = useState(fetchedOptimiseParam);

  const handleSave = async () => {
    //
    if (!isChanged) {
      onClose();
      return;
    }

    try {
      setLoading(true);

      await optimize3DModel(optimiseParam, optimEnabled);

      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  const isChanged = Object.keys(optimiseParam).some(
    (key) => optimiseParam[key] !== fetchedOptimiseParam[key]
  );

  return (
    <div className="flex items-center justify-center flex-col px-[29px] pb-6 [&_.folder]:w-full [&_.folder+.folder]:mt-[2px] [&_.folder-content]:pt-0 [&_.folder-content]:-mt-[5px]">
      <button type="button" className="absolute top-[11px] right-[11px] p-[5px] text-white/60 transition-colors duration-200 ease-out-quad hover:text-white" onClick={onClose}>
        <span className="u-visually-hidden">Close settings modal</span>
        <SpriteIcon id="close" width={14} height={14} />
      </button>

      <h2 className="text-center max-w-[180px] text-white text-center text-[18px] font-normal leading-5 pt-[25px] mb-3 pb-3 border-b border-white/10 w-full break-words">{data.name}</h2>

      <div className="max-w-full mx-auto w-full">
        <InputToggle
          className="mb-5"
          label="Geometry Optimization"
          value={optimEnabled}
          name={"compressEnabled"}
          color="white"
          onChange={(val) => {
            const checked = val.target.checked;

            setOptimizeParam({
              useWeld: checked,
              useDraco: checked,
              useMeshOpt: checked,
            });

            setOptimEnabled(checked);
          }}
        />

        {optimEnabled && (
          <>
            <InputCheckbox
              className="text-white border-0 [&+*]:border-t-0 [&_.box-ui]:bg-studio-dark [&_.box-ui]:rounded-studio-dark"
              label="Welding"
              defaultChecked={!!optimiseParam?.useWeld}
              name={"meshCompress"}
              size="s"
              onChange={(e) => {
                setOptimizeParam({
                  ...optimiseParam,
                  useWeld: e.target.checked,
                });
              }}
            />

            <InputCheckbox
              className="text-white border-0 [&+*]:border-t-0 [&_.box-ui]:bg-studio-dark [&_.box-ui]:rounded-studio-dark"
              label="Draco compression"
              defaultChecked={!!optimiseParam?.useDraco}
              name={"texCompress"}
              size="s"
              onChange={(e) => {
                setOptimizeParam({
                  ...optimiseParam,
                  useDraco: e.target.checked,
                });
              }}
            />

            <InputCheckbox
              className="text-white border-0 [&+*]:border-t-0 [&_.box-ui]:bg-studio-dark [&_.box-ui]:rounded-studio-dark"
              label="Mesh Optimizer"
              defaultChecked={!!optimiseParam?.useMeshOpt}
              name={"texCompress"}
              size="s"
              onChange={(e) => {
                setOptimizeParam({
                  ...optimiseParam,
                  useMeshOpt: e.target.checked,
                });
              }}
            />
          </>
        )}
      </div>

      <ButtonPill
        label={loading ? "Saving" : "Save"}
        color="bordered-white"
        onClick={handleSave}
        className="mt-5"
        size="m"
      >
        {loading ? <LoadingSpinner width={18} height={18} light /> : null}
      </ButtonPill>
    </div>
  );
}
