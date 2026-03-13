import { ReactNode } from "react";
import SpriteIcon from "../../../ui/sprite";

type AlertType =
  | "Success"
  | "Danger"
  | "Info"
  | "Warning"
  | "Question"
  | "None"
  | "Lock";

export interface AlertProps {
    type?: AlertType;
    title?: ReactNode;
    message: ReactNode;
    action?: ReactNode;
    onClose?: () => unknown;
    secondaryAction?: any;
    secondaryActionLabel?: string;
}

function getAlertIcon(type: AlertType) {
  if (type === "Success")
    return <SpriteIcon id="check" width={58} height={52} className="text-green-500" />;

  if (type === "Info")
    return <SpriteIcon id="studio/info-circle" width={58} height={52} className="text-blue-400" />;

  if (type === "Danger")
    return <SpriteIcon id="studio/warning" width={58} height={52} className="text-red-500" />;

  if (type === "Warning")
    return <SpriteIcon id="studio/warning" width={58} height={52} className="text-yellow-500" />;

  if (type === "Lock")
    return <SpriteIcon id="studio/lock" width={58} height={52} className="text-white" />;

  return null;
}

export function Alert({
    type = "Danger",
    title,
    message,
    action = "Okay",
    secondaryAction = null,
    secondaryActionLabel = null,
    onClose,
}: AlertProps) {
    //
    const icon = getAlertIcon(type);

    return (
        <div className="flex flex-col gap-4">
            {title && <h1 className="text-white text-lg font-medium text-center">{title}</h1>}

            <div className="flex flex-col items-center gap-4">
                {icon}

                {message && <p className="text-white/60 text-sm text-center">{message}</p>}
            </div>

            {(action || secondaryAction) && (
                <div className="flex gap-2">
                    {action && (
                        <button
                            className="flex-1 px-4 py-2 rounded-studio-button bg-studio-gray-dark text-white text-studio-button text-center hover:bg-studio-gray transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            {action}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            className="flex-1 px-4 py-2 rounded-studio-button bg-studio-gray-dark text-white text-studio-button text-center hover:bg-studio-gray transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                secondaryAction();
                                onClose();
                            }}
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
