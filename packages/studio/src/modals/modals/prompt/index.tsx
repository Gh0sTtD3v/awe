import { noop } from "../../../utils/js";
import SpriteIcon from "../../../ui/sprite";
import { ReactNode, useState } from "react";
import { InputText } from "../../../ui/inputs/input-text";
import { InputPassword } from "../../../ui/inputs/input-password";


export interface PromptProps {
  type: "text" | "password";
  title?: ReactNode;
  message: ReactNode;
  icon?: ReactNode;
  onSubmit?: (value: string) => void | Promise<void>;
  onClose?: (value: string) => void;
}

export function Prompt({
  type = "text",
  title,
  icon = null,
  onSubmit = noop,
  onClose = noop,
}: PromptProps) {
  //

  const [value, setValue] = useState("");

  const [isChecking, setIsChecking] = useState(false);

  const [error, setError] = useState(null);

  const hasError = error != null && !isChecking;

  const handleSubmit = async () => {
    //
    try {
      setIsChecking(true);

      await onSubmit(value);

      setError(null);

      setIsChecking(false);

      onClose(value);
      //
    } catch (err) {
      //
      console.error(err);

      setError(err.message);
    } finally {
      //
      setIsChecking(false);
    }
  };

  if (icon == null) {
    //
    icon =
      type === "password" ? (
        <SpriteIcon id="studio/warning" width={24} height={24} />
      ) : null;
  }

  return (
    <div className="flex flex-col gap-4">
      {title && <h1 className="text-white text-lg font-medium">{title}</h1>}

      <div className="flex flex-col items-center gap-4 w-full">
        {type === "password" && (
          <InputPassword
            label="Password"
            defaultValue={value}
            placeholder="•••••••••••••••"
            hasError={hasError}
            onChange={(value) => {
              setValue(value);
              setError(null);
            }}
            onKeyDown={(ev) => {
              //
              if (ev.key === "Enter") {
                ev.stopPropagation();
                handleSubmit();
              }
            }}
            disabled={isChecking}
          />
        )}
        {type === "text" && (
          <InputText
            type="email"
            label="Email"
            defaultValue={value}
            placeholder=""
            hasError={hasError}
            onChange={(ev) => {
              setValue((ev.target as any).value);
              setError(null);
            }}
            onKeyDown={(ev) => {
              //
              if (ev.key === "Enter") {
                ev.stopPropagation();
                handleSubmit();
              }
            }}
          />
        )}

      </div>

      <button className="w-full px-4 py-2 rounded-studio-button bg-studio-gray-dark text-white text-studio-button hover:bg-studio-gray transition-colors" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}
