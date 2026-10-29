"use client";

import { useStore } from "@/hooks/use-store";
import { infoStore } from "@/lib/info-store";

/**
 * Top centre while an admin previews the world as one role (opened from the
 * studio's chunk settings). Exiting reloads without the preview.
 */
export function RolePreviewBanner() {
  const { self } = useStore(infoStore);
  const preview = self?.preview;
  if (!preview) return null;

  const exit = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("previewRole");
    window.location.href = url.toString();
  };

  return (
    <div
      className="fixed left-1/2 top-4 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-black/70 py-1.5 pl-4 pr-1.5 text-sm text-white backdrop-blur-sm"
      // The start screen behind us starts the game on click.
      onClick={(e) => e.stopPropagation()}
    >
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: preview.color || "#99aab5" }} />
        Previewing as <strong className="font-semibold">{preview.name}</strong>
      </span>
      <button
        type="button"
        onClick={exit}
        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90"
      >
        Exit preview
      </button>
    </div>
  );
}
