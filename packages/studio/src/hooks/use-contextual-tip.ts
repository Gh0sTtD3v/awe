import { ImmerStore, useImmerStore } from "./use-immer-store";

const contextualTipStore = new ImmerStore({
  contextualTipContent: null,
  contextualTipParent: null,
  contextualTipPos: null,
  contextualTipMaxWidth: null,
  // contextualTipElement: null,
  contextualTipBoundElement: null,
  contextualTipHasRepositioned: false,
  contextualTipNoWrap: false,
  contextualTipInteractive: false,
  contextualTipDefaultPos: null,
  contextualTipCloseCallback: null,
});

export function useContextualTip() {
  const { state, update } = useImmerStore(contextualTipStore);

  return {
    contextualTipContent: state.contextualTipContent,
    contextualTipParent: state.contextualTipParent,
    contextualTipBoundElement: state.contextualTipBoundElement,
    contextualTipPos: state.contextualTipPos,
    contextualTipMaxWidth: state.contextualTipMaxWidth,
    contextualTipHasRepositioned: state.contextualTipHasRepositioned,
    contextualTipNoWrap: state.contextualTipNoWrap,
    contextualTipInteractive: state.contextualTipInteractive,
    contextualTipDefaultPos: state.contextualTipDefaultPos,
    contextualTipCloseCallback: state.contextualTipCloseCallback,

    setContextualTipOptions: (options) => {
      update((state) => {
        // Loop through each key-value pair in the options object
        for (const [key, value] of Object.entries(options)) {
          // Assign each value to the corresponding key in the state
          state[key] = value;
        }
        // Return the updated state
        return state;
      });
    },

    setContextualTipContent: (value) => {
      update((state) => {
        state.contextualTipContent = value;
      });
    },

    // setContextualTipParent: (value) => {
    //     update((state) => {
    //         state.contextualTipParent = value;
    //     });
    // },
    // setContextualTipBoundElement: (value) => {
    //     update((state) => {
    //         state.contextualTipBoundElement = value;
    //     });
    // },
    setContextualTipPos: (value) => {
      update((state) => {
        state.contextualTipPos = value;
      });
    },
    // setContextualTipMaxWidth: (value) => {
    //     update((state) => {
    //         state.contextualTipMaxWidth = value;
    //     });
    // },
    setContextualTipHasRepositioned: (value) => {
      update((state) => {
        state.contextualTipHasRepositioned = value;
      });
    },
    // setContextualTipNoWrap: (value) => {
    //     update((state) => {
    //         state.contextualTipNoWrap = value;
    //     });
    // },
    // setContextualTipInteractive: (value) => {
    //     update((state) => {
    //         state.contextualTipInteractive = value;
    //     });
    // },
    // setContextualTipDefaultPos: (value) => {
    //     update((state) => {
    //         state.contextualTipDefaultPos = value;
    //     });
    // },
    // setContextualTipCloseCallback: (value) => {
    //     update((state) => {
    //         state.contextualTipCloseCallback = value;
    //     });
    // },
  };
}
