// @ts-check

// import EncryptService from "app/api/encrypt";
import { useInput } from "./use-input";
import { showError, showInfo, showModal } from "../../modals/context";
import { useState } from "react";

async function encryptText(text: string) {
  //
  // const res = await EncryptService.opts({
  //     checksum: true,
  //     encode: true,
  // }).encrypt({ text });

  return text;
}

async function decryptText(text: string) {
  //
  // const secret = await EncryptService.opts({
  //     checksum: true,
  //     encode: true,
  // }).decrypt({ text: inputProps.value });

  return text;
}

export function useSecret(config) {
  //
  const [isEncrypting, setIsEncrypting] = useState(false);

  const onSave = async (text: string) => {
    //
    try {
      //
      setIsEncrypting(true);
      const res = await encryptText(text);

      console.log("onSave", res);

      return res;
    } catch (error) {
      //
      console.error(error);

      showError(error.message, "Encryption Error");
    } finally {
      setIsEncrypting(false);
    }
  };

  const inputProps = useInput({
    ...config,
    onSave,
  });

  const decrypt = async () => {
    //
    if (isEncrypting) return;

    const secret = await decryptText(inputProps.value);

    showInfo(secret);
  };

  return {
    inputProps,
    decrypt,
    isEncrypting,
  };
}
