import React from "react";
import { cn } from "../../../utils/cn";
import ButtonPill from "../../button-pill";
import SpriteIcon from "../../sprite";

interface FormButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  isActive?: boolean;
  isSubmit?: boolean;
  className?: string;
  icon?: string;
  onClick?: () => void;
}

function FormButton({
  className = "cancel",
  title = "Cancel",
  onClick,
  isActive = false,
  isSubmit = false,
  icon = "login",
  color = "black",
  ...rest
}: FormButtonProps) {
  return (
    <ButtonPill
      label={title}
      onClick={onClick}
      className={cn("flex", className)}
      disabled={!isActive}
      color={color}
    >
      {isActive && icon && <SpriteIcon id={icon} width={16} height={16} />}
    </ButtonPill>
  );
}

export default FormButton;
