import { ImmerStore, useImmerStore } from "./use-immer-store";

const customSelectStore = new ImmerStore({
  customSelectOptions: null,
  customSelectOptionsWidth: 258,
  currentCustomSelect: null,
  customSelectedOption: null,
  setCustomSelectedOption: null,
});

export function useCustomSelect() {
  const { state, update } = useImmerStore(customSelectStore);

  return {
    customSelectOptions: state.customSelectOptions,
    customSelectOptionsWidth: state.customSelectOptionsWidth,
    // customSelectOption: state.customSelectOption,
    currentCustomSelect: state.currentCustomSelect,
    customSelectedOption: state.customSelectedOption,
    setCustomSelectedOption: (option) => {
      update((state) => {
        state.customSelectedOption = option;
      });

      if (state.setCustomSelectedOption) {
        state.setCustomSelectedOption(option);
      }
    },
    setCustomSelectedOptionFunc: (func) => {
      update((state) => {
        state.setCustomSelectedOption = func;
      });
    },
    setCustomSelectOptions: (options) => {
      update((state) => {
        state.customSelectOptions = options;
      });
    },
    setCustomSelectOptionsWidth: (value) => {
      update((state) => {
        state.customSelectOptionsWidth = value;
      });
    },
    setCurrentCustomSelect: (el) => {
      update((state) => {
        state.currentCustomSelect = el;
      });
    },
  };
}
