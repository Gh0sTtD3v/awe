import { ImmerStore, useImmerStore } from "./use-immer-store";
import React, { useEffect, useState } from "react";

import ALL_PROMPTS from "../utils/all-prompts";

const promptTipStore = new ImmerStore({
  promptsHidden: false,
  message: null,
  activePrompt: null,
  queue: [],
});

export function usePromptTip() {
  const { state, update } = useImmerStore(promptTipStore);
  const [customPromptRepeat, updateCustomPromptRepeat] = useState({});

  const hidePrompt = (id) => {
    const queue = state.queue.filter((item) => item.id !== id);

    update((state) => {
      state.queue = queue;
      state.message =
        queue.length > 0 ? queue[queue.length - 1]?.message : null;
      state.activePrompt = queue.length > 0 ? queue[queue.length - 1] : null;
    });
  };

  const addCustomPromptRepeat = (id, repeats) => {
    updateCustomPromptRepeat({
      ...customPromptRepeat,
      [id]: repeats,
    });
  };

  return {
    promptsHidden: state.promptsHidden,
    message: state.message,
    activePrompt: state.activePrompt,
    hidePrompt: (id) => {
      hidePrompt(id);
    },
    showPrompt: (param) => {
      //
      const promptTipStorage = JSON.parse(
        window.localStorage.getItem("promptTips") || "{}"
      );

      const isObject = typeof param === "object";

      const id = isObject ? param.id : param;

      let item = param;

      if (!isObject) {
        item = ALL_PROMPTS.find((item) => {
          return item.id === id;
        });
      }

      const { message, display, autoHideTimeout, localStorage, position } =
        item;

      let repeats = item.repeats;

      if (isObject) {
        if (!customPromptRepeat?.[id] && customPromptRepeat?.[id] !== 0) {
          addCustomPromptRepeat(id, repeats);
        }

        repeats = customPromptRepeat[id] || repeats;

        if (localStorage) {
          repeats =
            promptTipStorage?.[id] != undefined
              ? promptTipStorage?.[id]
              : customPromptRepeat[id] || repeats;
        }
      } else if (localStorage) {
        repeats =
          promptTipStorage?.[id] != undefined
            ? promptTipStorage?.[id]
            : item.repeats;
      }

      if (repeats > 0 || repeats == null) {
        if (repeats > 0) {
          if (isObject) {
            addCustomPromptRepeat(id, repeats - 1);
          } else {
            item = {
              ...item,
              repeats: repeats - 1,
            };
          }

          if (localStorage) {
            const newStorage = {
              ...promptTipStorage,
              [id]: repeats - 1,
            };

            window.localStorage.setItem(
              "promptTips",
              JSON.stringify(newStorage)
            );
          }
        }

        if (autoHideTimeout) {
          setTimeout(() => {
            hidePrompt(id);
          }, autoHideTimeout);
        }

        update((state) => {
          state.queue = [...state.queue, item];
          state.message = message;
          state.activePrompt = item;
        });
      }
    },
    setPreventPromptsDisplay: (value) => {
      update((state) => {
        state.promptsHidden = value;
      });
    },
  };
}
