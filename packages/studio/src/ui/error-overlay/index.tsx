import { useRef, useState } from "react";
import { GameData } from "../../types/game-data";
import { createPortal } from "react-dom";

import { cn } from "../../utils/cn";


interface ErrorOverlayProps {
  errors: Array<{
    scope: "script" | "engine";
    message: string;
    stack: string;
    data?: any;
    script?: any;
  }>;
  game: GameData;
  onClose: () => void;
}

function _ErrorOverlay({ errors, onClose, game }: ErrorOverlayProps) {
  //
  const [isMinimized, setIsMinimized] = useState(true);
  const [stackToggled, setStackToggled] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const [index, setIndex] = useState(0);

  const errorsRef = useRef(errors);

  if (!errors.length) {
    return null;
  }

  if (errorsRef.current !== errors) {
    errorsRef.current = errors;
    setIndex(0);
  }

  const error = errors[index];

  const message = error.message;

  const stackInfos = parseStack(error.stack);

  const includeEngine = false;

  const stack = stackInfos
    .filter(
      (it) =>
        includeEngine ||
        (!it.file.startsWith("http") && !it.file.startsWith("webpack-internal"))
    )
    .map(
      (it) =>
        `at ${it.prefix} (${it.file}:${
          it.location ? `${it.location.line}:${it.location.column}` : ""
        })`
    )
    .join("\n");

  let lastLine = stackInfos[0] ?? {
    prefix: "",
    file: "",
    location: null,
  };

  let { prefix, file, location } = lastLine || {};

  let snippet = null;

  if (file && location) {
    //

    const script =
      error.script?.uri === lastLine.file
        ? error.script
        : Object.values(game.components).find(
            (it) => it.type === "script" && it.uri === lastLine.file
          );

    if (script) {
      snippet = getSnippet(script?.emit?.code ?? "", lastLine.location);
    }
  }

  if (isMinimized) {
    return createPortal(
      <div
        className={cn("fixed bottom-4 right-4 z-[9999] cursor-pointer")}
        onClick={() => setIsMinimized(false)}
      >
        <div className={cn("bg-studio-error text-white px-4 py-2 rounded flex items-center gap-4 shadow-[0_2px_4px_rgba(0,0,0,0.1)]")}>
          <span className={cn("text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]")}>Error: {message}</span>
          <button
            className={cn("bg-none border border-white text-white px-2 py-1 rounded cursor-pointer text-xs hover:bg-white/10")}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
          >
            Expand
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className={cn("fixed inset-0 bg-black/50 backdrop-blur-[4px] z-[9999]")}>
      <div className={cn("absolute inset-4 md:inset-[120px] bg-white rounded-lg shadow-[0_4px_6px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden")}>
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-2 border-b border-studio-light-border")}>
          <div className={cn("flex items-center gap-2")}>
            <button
              className={cn("text-studio-error border-none bg-none cursor-pointer p-1 hover:text-[#cc0000]")}
              onClick={() => setIndex((index) => Math.max(0, index - 1))}
            >
              ←
            </button>
            <button
              className={cn("text-studio-error border-none bg-none cursor-pointer p-1 hover:text-[#cc0000]")}
              onClick={() =>
                setIndex((index) => Math.min(errors.length - 1, index + 1))
              }
            >
              →
            </button>
            <span className={cn("text-sm text-studio-light-text")}>
              1 of {errors.length} unhandled error
            </span>
          </div>
          <div>
            <button
              className={cn("px-2 py-1 border-none bg-none cursor-pointer rounded ml-2 hover:bg-[#f5f5f5]")}
              onClick={() => setIsMinimized(true)}
            >
              _
            </button>
            <button
              className={cn("px-2 py-1 border-none bg-none cursor-pointer rounded ml-2 hover:bg-[#f5f5f5]")}
              onClick={() => onClose()}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={cn("flex-1 overflow-auto p-4")}>
          <h1 className={cn("text-2xl font-semibold mb-2")}>Unhandled Script Error</h1>
          <div className={cn("text-studio-error mb-6")}>Error: {message}</div>

          {/* Source */}
          {snippet && (
            <>
              <h2 className={cn("text-lg font-medium mb-2")}>Source</h2>
              <div className={cn("bg-studio-dark-alt rounded-lg overflow-hidden mb-4")}>
                {/* File info */}
                <div className={cn("flex items-center justify-between px-4 py-2 bg-black/50 text-white text-sm")}>
                  <span>
                    {file} ({location.line}:{location.column}) @ {prefix}
                  </span>
                  <button
                    className={cn("bg-none border-none text-white cursor-pointer p-1 hover:select-text hover:text-[#ccc]")}
                    onClick={() => {
                      if (snippet) {
                        navigator.clipboard.writeText(snippet).then(() => {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        });
                      }
                    }}
                    title={isCopied ? "Copied!" : "Copy to clipboard"}
                  >
                    {isCopied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        width="12"
                        height="12"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        width="12"
                        height="12"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Code snippet */}
                <div className={cn("p-4 font-mono text-sm leading-relaxed overflow-x-auto [&_pre]:text-white [&_pre]:m-0")}>
                  <pre>{snippet}</pre>
                </div>
              </div>
            </>
          )}

          {/* Stack trace toggle */}
          <button
            className={cn("text-sm text-studio-light-text bg-none border-none cursor-pointer p-0 hover:text-studio-light-text-hover")}
            onClick={(e) => {
              e.stopPropagation();
              setStackToggled(!stackToggled);
            }}
          >
            Show collapsed frames
          </button>

          {/* Stack trace */}
          {!stackToggled && <pre className={cn("mt-4 p-4 bg-[#f5f5f5] rounded-lg text-sm overflow-x-auto whitespace-pre-wrap")}>{stack}</pre>}
        </div>
      </div>
    </div>
  );
}

export const ErrorOverlay = _ErrorOverlay;

interface Location {
  line: number;
  column: number;
}

interface StackInfo {
  location: Location | null;
  file: string;
  prefix?: string;
}

function parseStack(stack: string): StackInfo[] {
  //
  return (stack || "")
    .split("\n")
    .map((line) => {
      const info = getStackInfo(line);
      return info;
    })
    .filter(Boolean);
}

function getStackInfo(stackLine: string): StackInfo {
  // Remove leading whitespace
  stackLine = stackLine.trim();

  // Basic structure: "at [prefix] [(file:line:column)]"
  // attention: file is an url and might contain colons
  const match = stackLine.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/);

  if (!match) {
    return null;
  }

  let [_, prefix, file, line, column] = match;

  // Clean up prefix and file
  prefix = prefix ? prefix.trim() : "anonymous";

  // If file wasn't in parentheses, it might be in the prefix
  if (!file && prefix.includes(":")) {
    const parts = prefix.split(":");
    file = parts[0];
    prefix = "anonymous";
  }

  return {
    prefix: prefix,
    file: file || "unknown",
    location: {
      line: parseInt(line, 10) || 0,
      column: parseInt(column, 10) || 0,
    },
  };
}

function getSnippet(script: string, position: Location) {
  //
  const code = script.split("\n");

  const start = Math.max(2, position.line - 5);

  const end = Math.min(code.length, position.line + 5);

  return code.slice(start, end).join("\n");
}
