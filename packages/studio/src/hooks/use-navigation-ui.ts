import { ImmerStore, useImmerStore } from "./use-immer-store";

const navigationUiStore = new ImmerStore({
  preventHover: false,
});

export function useNavigationUi() {
  const { state, update } = useImmerStore(navigationUiStore);

  const setPreventHover = (bool) => {
    update((state) => {
      state.preventHover = bool;
    });
  };

  return {
    preventHover: state.preventHover,
    setPreventHover,
  };
}
