import { useState } from "react";
import { ClientAvatarService } from "../../../../../services/client-avatar-service";
import type { ComponentData } from "@oncyberio/engine";
import { useAvatar } from "../../../../../contexts/avatar-context";
import { VrmInfo } from "../../../../../hooks/use-avatar-list";
import { AssetCard } from "../../../../asset-card";
import { showConfirm, showError } from "../../../../../modals/context";
import { useComponentAddHandler } from "../../../../../hooks/use-component-add-handler";
import { DEFAULT_AVATAR_IMAGE } from "../../../../../utils/constants";

function avatarFormatter(data: VrmInfo): ComponentData {
  return {
    name: data.name,
    type: "avatar",
    url: data.url,
    image: data.image,
    urlCompressed: data.urlCompressed,
  };
}

export function AvatarCard({ data, editable, userAvatars, ...rest }) {
  //
  const info = {
    id: data.id,
    name: data.name,
    url: data.glb,
    urlCompressed: data.glbCompressed,
    image: data.image ?? DEFAULT_AVATAR_IMAGE,
  };

  const [error, setError] = useState(null);

  const handler = useComponentAddHandler(avatarFormatter);

  const { setUploadedAvatars, updateUploadedAvatar } = useAvatar();

  const handleClick = () => {
    //
    handler.handleAdd(info);
  };

  const handleDrag = (e: React.DragEvent) => {
    //
    handler.handleDrag(e, info);
  };

  const handleNameEdit = async (e) => {
    try {
      const name = e.target.value;

      if (!name) return;

      await ClientAvatarService.editAvatar(info.id, {
        name,
      });

      updateUploadedAvatar(info.id, { name });

      //
    } catch (error) {
      setError("Failed to edit avatar name, Please try again later.");
    }
  };

  const handleRemove = () => {
    //
    try {
      //
      showConfirm(
        `Delete Avatar`,
        "Danger",
        `Are you sure you want to delete this avatar?`,
        async () => {
          const avatarId = data.id;

          await ClientAvatarService.deleteAvatar(avatarId);

          const newAvatars = userAvatars.filter(
            (avatar) => avatar.id !== avatarId
          );

          setUploadedAvatars(newAvatars);
        }
      );
    } catch (error) {
      showError(
        "An error occurred while removing the avatar, Please try again!",
        "Failed"
      );
      console.log("error", error);
    }
  };

  const handleInputEditChange = () => {
    if (error) setError(null);
  };

  const canDeleteAndEdit = data.type === "uploaded";

  return (
    <AssetCard
      display="square"
      editError={error}
      title={info.name}
      image={info.image}
      //onDrag={handleDrag}
      onClick={handleClick}
      editable={!!canDeleteAndEdit}
      onRemove={canDeleteAndEdit ? handleRemove : null}
      onEditName={canDeleteAndEdit ? handleNameEdit : null}
      onInputEditChange={canDeleteAndEdit ? handleInputEditChange : null}
      {...rest}
    />
  );
}
