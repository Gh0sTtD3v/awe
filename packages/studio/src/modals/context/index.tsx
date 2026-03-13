import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import React, { type JSX, useContext, useRef, useState } from "react";
import { Alert } from "../modals/alert";
import { Confirm, ConfirmType } from "../modals/confirm";
import { UserDialogProps, Dialog } from "../modals/dialog";
import { Prompt } from "../modals/prompt";

let showDialogRef = null;
let closeDialogRef = null;

type DialogContextType = {
  modals: Array<any>;
  showDialog: <T = any>(
    element: JSX.Element,
    opts?: UserDialogProps
  ) => { promise: Promise<T>; close: () => void };
  closeModal: (id: string) => void;
};

const DialogContext = React.createContext<DialogContextType>(null);

let uid = 0;

const baseZIndex = 10000;

export function DialogProvider(props: { children: React.ReactNode }) {
  //
  const [modals, setModals] = useState([]);

  const onHide = (modalId) => {
    setModals((state) => {
      const modals = state.filter((it) => it.id !== modalId);

      if (modals.length === 0) {
        document.body.style.overflow = "";
      }

      return modals;
    });
  };

  const resolvers = useRef({});

  function handleShow<T = any>(
    modal: JSX.Element,
    props: UserDialogProps = {}
  ) {
    let id = ++uid;
    let closeFunction: () => void;

    const promise = new Promise<T>(function (resolve) {
      resolvers.current[id] = resolve;

      document.body.style.overflow = "hidden";

      setModals((state) => {
        return state.concat({
          id,
          userId: props.id,
          index: id,
          element: React.cloneElement(modal, {
            onClose: (result) => {
              handleResult(id, result, null);
            },
            close: (result) => {
              handleResult(id, result, null);
            },
            preventDefaultClosing: props.preventDefaultClosing,
          }),
          props,
        });
      });

      closeFunction = () => handleResult(id, undefined, null);
    });

    return { promise, close: closeFunction };
  }

  const handleClose = (id) => {
    //
    const modal = modals.find((it) => it.userId && it.userId === id);
    if (modal) {
      onHide(modal.id);
    }
  };

  useIsoLayoutEffect(() => {
    showDialogRef = handleShow;
    closeDialogRef = handleClose;
  }, [handleShow, handleClose]);

  const modalContext: DialogContextType = {
    modals,
    //
    showDialog: handleShow,
    closeModal: handleClose,
  };

  const handleResult = (id, result, type) => {
    const resolve = resolvers.current[id];
    console.log("hanlde result", resolve);
    onHide(id);
    resolve(result);
  };

  const handleCancel = (id, type) => {
    //
    handleResult(id, undefined, type);
  };

  return (
    <DialogContext.Provider value={modalContext}>
      {props.children}

      {modals.map(({ id, index, element, props }) => {
        //

        const { style, overlayStyle, ...rest } = props;

        return (
          <Dialog
            key={`Modal${index}`}
            overlayStyle={{
              ...overlayStyle,
              zIndex: baseZIndex * 2 + index,
            }}
            style={{
              ...style,
              zIndex: baseZIndex * 2 + index + 1,
            }}
            onHide={() => {
              handleCancel(id, null);

              if (props?.onClose) {
                props.onClose();
              }
            }}
            {...rest}
          >
            {element}
          </Dialog>
        );
      })}
    </DialogContext.Provider>
  );
}

export const useDialog = () => {
  //
  const context = useContext(DialogContext);

  if (!context) {
    throw Error("useDialog needs to be called within DialogContext.");
  }

  return context;
};

export function showModal<T = any>(
  element: React.ReactNode,
  props?: UserDialogProps
): { promise: Promise<T>; close: () => void } {
  if (showDialogRef == null) {
    const msg = "Can't find DialogContext";
    console.error(msg);
    throw new Error(msg);
  }

  return showDialogRef(element, props);
}

let pendingId = 0;

export function createModal() {
  //
  if (showDialogRef == null) {
    const msg = "Can't find DialogContext";
    console.error(msg);
    throw new Error(msg);
  }

  let id = `pending-${++pendingId}`;

  let closePending = null;

  return (content: React.ReactNode, props?: UserDialogProps) => {
    //

    closePending?.();

    if (content == null) return;

    closePending = () => {
      closeDialogRef(id);
    };

    return showModal(content, { ...props, isModal: true, id });
  };
}

const alertProps: UserDialogProps = {
  style: {},
  isModal: false,
};

export function showInfo(message: string, title?: string) {
  return showModal<void>(
    <Alert type="Info" message={message} title={title} />,
    alertProps
  );
}

export function showWarning(message: string, title?: string) {
  return showModal<void>(
    <Alert type="Warning" message={message} title={title} />,
    alertProps
  );
}

export function showError(
  message: string,
  title?: string,
  secondaryAction = null,
  secondaryActionLabel?: string
) {
  return showModal<void>(
    <Alert
      type="Danger"
      message={message}
      title={title}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />,
    alertProps
  );
}

export function showSuccess(message: string, title?: string) {
  return showModal<void>(
    <Alert type="Success" message={message} title={title} />,
    alertProps
  );
}

export function showConfirm(
  title: string,
  type: ConfirmType,
  message: string,
  onAction?: () => unknown,
  btnName?: string,
  onCancel?: () => unknown,
  cancelName?: string
) {
  return new Promise((resolve) => {
    const setConfirmResult = (result: boolean) => {
      resolve(result);
    };

    showModal(
      <Confirm
        type={type}
        title={title}
        message={message}
        onAction={onAction}
        action={btnName || "Delete"}
        onCancel={onCancel}
        cancelName={cancelName}
        setConfirmResult={setConfirmResult}
      />,
      alertProps
    );
  });
}

export function showPromptDialog(props: {
  type: "text" | "password";
  title: string;
  message: string;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  return showModal<void>(
    <Prompt
      type={props.type}
      title={props.title}
      message={props.message}
      onSubmit={props.onSubmit}
    />,
    alertProps
  );
}
