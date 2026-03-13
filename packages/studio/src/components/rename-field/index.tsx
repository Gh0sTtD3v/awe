import { useEffect, useRef, useState } from "react";

import { classes } from "../../utils/classes";

export function RenameField({
  id,
  value,
  error = null,
  disabledEditing = false,
  resetError = () => {},
  onSubmit = (newValue: string) => {},
  children = null,
}) {
  const inputName = useRef(null);
  const doubleClickTimeout = useRef(null);

  const [val, setVal] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [doubleClicked, setDoubleClicked] = useState(false);

  const submit = (newValue: string) => {
    try {
      onSubmit(newValue);
    } catch (error) {
      console.error("Field error:", error);
      setVal(value);
      inputName.current.value = value;
      inputName.current.focus();
    }
  };

  useEffect(() => {
    if (val !== value) {
      inputName.current.value = value;
    }
  }, [value]);

  return (
    <form
      className={classes(
        "rename-field",
        disabledEditing && "rename-field-disabled",
        doubleClicked && "rename-field-double-clicked",
        isFocused && "rename-field-is-focused"
      )}
      action="#"
      onSubmit={(e) => {
        e.preventDefault();
        const value = (e.currentTarget.elements[0] as HTMLInputElement).value;
        submit(value);
      }}
    >
      {!disabledEditing && (
        <input
          ref={inputName}
          type="text"
          name={id}
          defaultValue={val}
          id={id}
          className={classes(
            "rename-field-input",
            "outline-none",
            doubleClicked ? "pointer-events-auto" : "pointer-events-none",
            "focus:pointer-events-auto"
          )}
          onBlur={(e) => {
            submit(e.currentTarget.value);
            setIsFocused(false);
            setDoubleClicked(false);
          }}
          onChange={(e) => {
            resetError();
            setVal(e.currentTarget.value);
          }}
          onFocus={() => {
            setIsFocused(true);
            setDoubleClicked(false);
            clearTimeout(doubleClickTimeout.current);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setVal(value);
              inputName.current.value = value;
              inputName.current.blur();
            } else if (e.key === "Enter") {
              inputName.current.blur();
            }
          }}
          tabIndex={-1}
        />
      )}

      <label
        htmlFor={id}
        className={classes("rename-field-label", disabledEditing && "cursor-default")}
        onClick={(e) => {
          if (disabledEditing) return;

          if (!doubleClicked) {
            e.preventDefault();

            setDoubleClicked(true);
            doubleClickTimeout.current = setTimeout(() => {
              setDoubleClicked(false);
            }, 300);
          }
        }}
      >
        {val}
      </label>

      {error && (
        <div className="rename-field-error">
          {error}
        </div>
      )}

      {children}
    </form>
  );
}
