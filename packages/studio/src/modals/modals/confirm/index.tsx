import SpriteIcon from "../../../ui/sprite";
import ButtonPill from "../../../ui/button-pill";
import { ReactNode, useState } from "react";
import { LoadingSpinner } from "../../../ui/loading-spinner";

export type ConfirmType = "Danger" | "Success";

type ConfirmProps = {
  type?: ConfirmType;
  title?: ReactNode;
  message: ReactNode;
  action?: ReactNode;
  cancelName: String;
  onCancel?: () => unknown;
  onClose?: () => unknown;
  onAction?: () => unknown;
  setConfirmResult: any;
};


const getAlertIcon = (type: ConfirmType) => {
  if (type === "Danger")
    return <SpriteIcon id="studio/warning" width={58} height={52} className="text-red-500" />;

  if (type === "Success")
    return <SpriteIcon id="check" width={58} height={52} className="text-green-500" />;

  return null;
};

export function Confirm({
  type = "Danger",
  title,
  message,
  action = "Delete",
  cancelName = "Cancel",
  onCancel,
  onClose,
  onAction,
  setConfirmResult,
}: ConfirmProps) {
  //
  const [isLoading, setIsLoading] = useState(false);
  const icon = getAlertIcon(type);

  const handleAction = async (e) => {
    e.stopPropagation();
    setConfirmResult(true);

    let res = onAction?.();

    if (res instanceof Promise) {
      setIsLoading(true);
      await res;
      setIsLoading(false);
    }

    onClose?.();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setConfirmResult(false);
    onCancel?.();
    onClose?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {title && <h1 className="text-white text-lg font-medium">{title}</h1>}

      <div className="flex flex-col items-center gap-4">
        {icon}

        {message && <p className="text-white/60 text-sm text-center">{message}</p>}
      </div>

      {(action || onCancel) && (
        <div className="flex gap-2">
          {onCancel && (
            <ButtonPill
              label={cancelName}
              color="bordered-black"
              onClick={handleCancel}
              className="flex-1 justify-center"
              size="m"
            />
          )}

          {action && (
            <ButtonPill
              label={action}
              color="bordered-black"
              onClick={handleAction}
              className="flex-1 justify-center"
              size="m"
            >
              {isLoading && <LoadingSpinner width={14} height={14} />}
            </ButtonPill>
          )}
        </div>
      )}
    </div>
  );
}
