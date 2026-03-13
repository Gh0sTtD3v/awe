// @ts-check
import { useEventCallback } from "../../hooks/use-event-callback";
import { useDispatcher } from "./dispatcher";

export function useAction({ label, onAction: _onAction }) {
  //
  const dispatcher = useDispatcher();

  const onAction = useEventCallback((e) => {
    //
    dispatcher.dispatch({
      origin: "action",
      run() {
        //
        return _onAction(e);
      },
    });
  }, []);

  return onAction;
}

export function useActionList(actions) {
  //
  const dispatcher = useDispatcher();

  return actions.map((it) => {
    //
    const _onAction = it.onAction;

    const onAction = useEventCallback((e) => {
      //
      dispatcher.dispatch({
        origin: "action",
        run() {
          //
          return _onAction(e);
        },
      });
    }, []);

    return { ...it, onAction };
  });
}
