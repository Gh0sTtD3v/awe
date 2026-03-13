import { Engine } from "@oncyberio/engine";
import { useEffect, useRef } from "react";

export function GameCanvas() {
  const sceneContainer = useRef<HTMLDivElement>(null);
  const canvasContainer = useRef<HTMLDivElement>(null);
  const wasInit = useRef(false);

  useEffect(() => {
    if (!canvasContainer.current || wasInit.current) return;
    wasInit.current = true;

    const resize = () => {
      engine.resize({
        w: canvasContainer.current.clientWidth,
        h: canvasContainer.current.clientHeight,
      });
    };

    window.addEventListener("resize", resize);

    const engine = Engine.getInstance();
    canvasContainer.current.textContent = "";
    engine.ready.then(() => {
      if (!canvasContainer.current) return;
      canvasContainer.current.appendChild(engine.canvas);
      setTimeout(() => {
        resize();
      }, 0);
    });

    return () => {
      window.removeEventListener("resize", resize);
      wasInit.current = false;
      engine.canvas.parentElement?.removeChild(engine.canvas);
    };
  }, [canvasContainer.current]);

  return (
    <div className="w-full h-full bg-black" ref={sceneContainer} id="exhibit">
      <div
        id="canvas-container"
        className="outline-none w-full h-full absolute left-0 top-0 pointer-events-auto"
        ref={canvasContainer}
      />
      <div id="oo-ui-root" className="absolute top-0 left-0 pointer-events-auto" />
    </div>
  );
}
