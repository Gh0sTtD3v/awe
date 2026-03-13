import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { pinataLoader } from "../utils/pinata-loader";

function defaultLoader({ src, width }) {
  return src;
}

const pinata_prefix = "https://cyber.mypinata.cloud";

export function NextImage(props: ImageProps) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [props.src]);

  if (!props.src || errored)
    return (
      <div
        style={{
          ...props.style,
          width: props.width || "100%",
          height: props.height || "100%",
          background: "#ececec",
        }}
      />
    );

  const isPinata = (props.src as string).startsWith(pinata_prefix);

  return (
    <Image
      loader={isPinata ? pinataLoader : defaultLoader}
      {...props}
      {...(isPinata ? {} : { unoptimized: true })}
      onError={() => setErrored(true)}
    />
  );
}
